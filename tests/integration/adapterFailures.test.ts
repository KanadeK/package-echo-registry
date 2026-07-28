import { copyFile, cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadAnalysisInput } from '../../src/adapters/fsMonorepoAdapter.js';

const fixtureRoot = fileURLToPath(new URL('../../examples/fixture-monorepo', import.meta.url));
let sandboxRoot: string;

beforeEach(async () => {
  sandboxRoot = await mkdtemp(path.join(tmpdir(), 'package-echo-fixture-'));
  await cp(fixtureRoot, sandboxRoot, { recursive: true });
});

afterEach(async () => {
  await rm(sandboxRoot, { force: true, recursive: true });
});

describe('filesystem adapter failure paths', () => {
  it('rejects malformed workspace JSON with the concrete relative path', async () => {
    await writeFile(path.join(sandboxRoot, 'packages', 'core', 'package.json'), '{', 'utf8');

    await expect(loadAnalysisInput({ root: sandboxRoot })).rejects.toMatchObject({
      code: 'INVALID_JSON',
      relativePath: 'packages/core/package.json',
    });
  });

  it('rejects malformed Changesets and duplicate API package snapshots', async () => {
    await writeFile(path.join(sandboxRoot, '.changeset', 'broken.md'), 'not front matter', 'utf8');
    await expect(loadAnalysisInput({ root: sandboxRoot })).rejects.toMatchObject({
      code: 'INVALID_CHANGESET',
      relativePath: '.changeset/broken.md',
    });

    await rm(path.join(sandboxRoot, '.changeset', 'broken.md'));
    await copyFile(
      path.join(sandboxRoot, 'api-reports', 'current', 'echo-core.api.json'),
      path.join(sandboxRoot, 'api-reports', 'current', 'echo-core-copy.api.json'),
    );
    await expect(loadAnalysisInput({ root: sandboxRoot })).rejects.toMatchObject({
      code: 'INVALID_API_REPORT',
    });
  });

  it('blocks API report directory traversal outside the selected root', async () => {
    await expect(
      loadAnalysisInput({
        root: sandboxRoot,
        previousApiDirectory: '../outside',
      }),
    ).rejects.toMatchObject({
      code: 'PATH_OUTSIDE_ROOT',
      relativePath: '../outside',
    });
  });
});
