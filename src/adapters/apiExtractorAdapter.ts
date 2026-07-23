import path from 'node:path';

import fg from 'fast-glob';
import { z } from 'zod';

import type { ApiMember, ApiSnapshot } from '../core/model.js';
import { AdapterError } from './errors.js';
import { readJsonFile } from './fileReader.js';
import { repositoryRelativePath, resolveWithinRoot } from './pathSafety.js';

const apiReportSchema = z
  .object({
    kind: z.string().min(1),
    name: z.string().min(1),
    packageVersion: z.string().min(1).optional(),
    metadata: z
      .object({
        packageVersion: z.string().min(1).optional(),
      })
      .passthrough()
      .optional(),
    members: z.array(z.unknown()),
  })
  .passthrough();

const apiItemSchema = z
  .object({
    canonicalReference: z.string().min(1).optional(),
    excerptTokens: z
      .array(
        z
          .object({
            text: z.string(),
          })
          .passthrough(),
      )
      .optional(),
    kind: z.string().min(1),
    members: z.array(z.unknown()).optional(),
    name: z.string().optional(),
  })
  .passthrough();

const containerKinds = new Set(['EntryPoint', 'Model', 'Namespace', 'Package']);

function collectMembers(
  rawItems: unknown[],
  relativePath: string,
  packageName: string,
): ApiMember[] {
  const members = new Map<string, ApiMember>();

  const visit = (rawItem: unknown): void => {
    const result = apiItemSchema.safeParse(rawItem);
    if (!result.success) {
      throw new AdapterError(
        'INVALID_API_REPORT',
        relativePath,
        'An API report member has an invalid shape.',
      );
    }
    const item = result.data;
    if (item.name && !containerKinds.has(item.kind)) {
      const signature =
        item.excerptTokens
          ?.map((token) => token.text)
          .join('')
          .trim() || item.name;
      const id =
        item.canonicalReference ?? `${packageName}!${item.name}:${item.kind.toLowerCase()}`;
      members.set(id, {
        id,
        name: item.name,
        kind: item.kind,
        signature,
      });
    }
    for (const child of item.members ?? []) {
      visit(child);
    }
  };

  for (const rawItem of rawItems) {
    visit(rawItem);
  }
  return [...members.values()].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}

export async function readApiSnapshots(
  root: string,
  directory: string,
  currentVersions: Map<string, string>,
): Promise<ApiSnapshot[]> {
  const absoluteDirectory = resolveWithinRoot(root, directory);
  const files = await fg('**/*.api.json', {
    absolute: true,
    cwd: absoluteDirectory,
    onlyFiles: true,
    unique: true,
  });
  if (files.length === 0) {
    throw new AdapterError(
      'INVALID_API_REPORT',
      repositoryRelativePath(root, absoluteDirectory),
      'No API Extractor report files were found.',
    );
  }

  const snapshots: ApiSnapshot[] = [];
  for (const file of files.sort((left, right) => left.localeCompare(right))) {
    const relativePath = repositoryRelativePath(root, file);
    const result = apiReportSchema.safeParse(await readJsonFile(root, file));
    if (!result.success || result.data.kind !== 'Package') {
      throw new AdapterError(
        'INVALID_API_REPORT',
        relativePath,
        'The file must be an API Extractor Package report.',
      );
    }
    const packageVersion =
      result.data.packageVersion ??
      result.data.metadata?.packageVersion ??
      currentVersions.get(result.data.name);
    if (!packageVersion) {
      throw new AdapterError(
        'INVALID_API_REPORT',
        relativePath,
        'The report must include packageVersion when no manifest fallback exists.',
      );
    }
    snapshots.push({
      packageName: result.data.name,
      packageVersion,
      relativePath,
      members: collectMembers(result.data.members, relativePath, result.data.name),
    });
  }

  const uniqueNames = new Set(snapshots.map((snapshot) => snapshot.packageName));
  if (uniqueNames.size !== snapshots.length) {
    throw new AdapterError(
      'INVALID_API_REPORT',
      repositoryRelativePath(root, path.resolve(absoluteDirectory)),
      'Each snapshot directory may contain only one report per package.',
    );
  }
  return snapshots.sort((left, right) => left.packageName.localeCompare(right.packageName));
}
