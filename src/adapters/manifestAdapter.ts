import path from 'node:path';

import fg from 'fast-glob';
import { z } from 'zod';

import type { PackageKind, PackageManifest } from '../core/model.js';
import { AdapterError } from './errors.js';
import { readJsonFile } from './fileReader.js';
import { repositoryRelativePath } from './pathSafety.js';

const dependencyMapSchema = z.record(z.string(), z.string());
const rootManifestSchema = z
  .object({
    workspaces: z.union([
      z.array(z.string().min(1)),
      z
        .object({
          packages: z.array(z.string().min(1)),
        })
        .passthrough(),
    ]),
  })
  .passthrough();

const workspaceManifestSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    dependencies: dependencyMapSchema.optional(),
    devDependencies: dependencyMapSchema.optional(),
    peerDependencies: dependencyMapSchema.optional(),
    packageEcho: z
      .object({
        kind: z.enum(['package', 'consumer', 'example']),
      })
      .strict()
      .optional(),
  })
  .passthrough();

interface ParsedManifest {
  data: z.infer<typeof workspaceManifestSchema>;
  relativePath: string;
}

function workspacePatterns(rootManifest: z.infer<typeof rootManifestSchema>): string[] {
  return Array.isArray(rootManifest.workspaces)
    ? rootManifest.workspaces
    : rootManifest.workspaces.packages;
}

function inferKind(manifest: ParsedManifest, workspaceNames: Set<string>): PackageKind {
  if (manifest.data.packageEcho) {
    return manifest.data.packageEcho.kind;
  }
  if (manifest.relativePath.startsWith('apps/') || manifest.relativePath.startsWith('examples/')) {
    return 'example';
  }
  const dependencyNames = [
    ...Object.keys(manifest.data.dependencies ?? {}),
    ...Object.keys(manifest.data.devDependencies ?? {}),
    ...Object.keys(manifest.data.peerDependencies ?? {}),
  ];
  return dependencyNames.some((name) => workspaceNames.has(name)) ? 'consumer' : 'package';
}

export async function readWorkspaceManifests(root: string): Promise<PackageManifest[]> {
  const rootManifestPath = path.join(root, 'package.json');
  const rawRootManifest = await readJsonFile(root, rootManifestPath);
  const rootResult = rootManifestSchema.safeParse(rawRootManifest);
  if (!rootResult.success) {
    throw new AdapterError(
      'INVALID_MANIFEST',
      'package.json',
      'The root manifest must declare npm-compatible workspaces.',
    );
  }

  const manifestFiles = await fg(
    workspacePatterns(rootResult.data).map((pattern) => `${pattern}/package.json`),
    {
      absolute: true,
      cwd: root,
      dot: false,
      onlyFiles: true,
      unique: true,
    },
  );
  if (manifestFiles.length === 0) {
    throw new AdapterError(
      'INVALID_MANIFEST',
      'package.json',
      'No package manifests matched the declared workspaces.',
    );
  }

  const parsed: ParsedManifest[] = [];
  for (const manifestFile of manifestFiles.sort((left, right) => left.localeCompare(right))) {
    const relativePath = repositoryRelativePath(root, manifestFile);
    const result = workspaceManifestSchema.safeParse(await readJsonFile(root, manifestFile));
    if (!result.success) {
      throw new AdapterError(
        'INVALID_MANIFEST',
        relativePath,
        'A workspace manifest is missing a valid name, version, or dependency map.',
      );
    }
    parsed.push({
      data: result.data,
      relativePath,
    });
  }

  const workspaceNames = new Set(parsed.map((manifest) => manifest.data.name));
  if (workspaceNames.size !== parsed.length) {
    throw new AdapterError(
      'INVALID_MANIFEST',
      'package.json',
      'Workspace package names must be unique.',
    );
  }

  return parsed
    .map((manifest) => ({
      name: manifest.data.name,
      version: manifest.data.version,
      relativePath: manifest.relativePath,
      kind: inferKind(manifest, workspaceNames),
      dependencies: manifest.data.dependencies ?? {},
      devDependencies: manifest.data.devDependencies ?? {},
      peerDependencies: manifest.data.peerDependencies ?? {},
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
