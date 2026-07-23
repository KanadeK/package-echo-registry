import path from 'node:path';

import fg from 'fast-glob';
import { parse } from 'yaml';
import { z } from 'zod';

import type { ChangesetRecord } from '../core/model.js';
import { AdapterError } from './errors.js';
import { readUtf8File } from './fileReader.js';
import { repositoryRelativePath } from './pathSafety.js';

const releaseMapSchema = z.record(z.string().min(1), z.enum(['major', 'minor', 'patch']));
const frontMatterPattern = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]+)$/;

export async function readChangesets(root: string): Promise<ChangesetRecord[]> {
  const files = await fg('.changeset/*.md', {
    absolute: true,
    cwd: root,
    onlyFiles: true,
    unique: true,
  });
  const records: ChangesetRecord[] = [];

  for (const file of files.sort((left, right) => left.localeCompare(right))) {
    if (path.basename(file).toLowerCase() === 'readme.md') {
      continue;
    }
    const relativePath = repositoryRelativePath(root, file);
    const content = await readUtf8File(root, file);
    const match = content.match(frontMatterPattern);
    if (!match) {
      throw new AdapterError(
        'INVALID_CHANGESET',
        relativePath,
        'Changesets require YAML front matter and a summary.',
      );
    }
    let yaml: unknown;
    try {
      yaml = parse(match[1] ?? '');
    } catch {
      throw new AdapterError(
        'INVALID_CHANGESET',
        relativePath,
        'Changeset front matter is not valid YAML.',
      );
    }
    const releases = releaseMapSchema.safeParse(yaml);
    const summary = (match[2] ?? '').trim();
    if (!releases.success || Object.keys(releases.data).length === 0 || summary.length === 0) {
      throw new AdapterError(
        'INVALID_CHANGESET',
        relativePath,
        'Changeset releases and summary must not be empty.',
      );
    }

    records.push({
      id: path.basename(file, '.md'),
      relativePath,
      summary,
      releases: Object.entries(releases.data)
        .map(([name, type]) => ({
          name,
          type,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    });
  }

  return records;
}
