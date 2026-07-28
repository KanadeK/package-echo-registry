import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertDirectory, readJsonFile, readUtf8File } from '../../src/adapters/fileReader.js';

let root: string;

beforeEach(async () => {
  root = path.join(tmpdir(), `package-echo-reader-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe('filesystem error mapping', () => {
  it('maps missing files and invalid JSON to stable adapter errors', async () => {
    await expect(readUtf8File(root, path.join(root, 'missing.json'))).rejects.toMatchObject({
      code: 'MISSING_FILE',
      relativePath: 'missing.json',
    });

    const invalidJson = path.join(root, 'invalid.json');
    await writeFile(invalidJson, '{', 'utf8');
    await expect(readJsonFile(root, invalidJson)).rejects.toMatchObject({
      code: 'INVALID_JSON',
      relativePath: 'invalid.json',
    });
  });

  it('maps permission failures without relying on host ACL behavior', async () => {
    const denied = Object.assign(new Error('denied'), { code: 'EACCES' });
    await expect(
      readUtf8File(root, path.join(root, 'private.json'), async () => {
        throw denied;
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      relativePath: 'private.json',
    });
  });

  it('rejects a file or missing path when a directory is required', async () => {
    const file = path.join(root, 'file.txt');
    await writeFile(file, 'content', 'utf8');

    await expect(assertDirectory(file)).rejects.toMatchObject({ code: 'ROOT_NOT_FOUND' });
    await expect(assertDirectory(path.join(root, 'missing'))).rejects.toMatchObject({
      code: 'ROOT_NOT_FOUND',
    });
  });
});
