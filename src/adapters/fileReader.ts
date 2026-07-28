import { readFile, stat } from 'node:fs/promises';

import { AdapterError } from './errors.js';
import { repositoryRelativePath } from './pathSafety.js';

type ReadTextFile = (filePath: string) => Promise<string>;

const defaultReadTextFile: ReadTextFile = async (filePath) => readFile(filePath, 'utf8');

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

export async function assertDirectory(root: string): Promise<void> {
  try {
    const metadata = await stat(root);
    if (!metadata.isDirectory()) {
      throw new AdapterError('ROOT_NOT_FOUND', '.', 'The selected root is not a directory.');
    }
  } catch (error) {
    if (error instanceof AdapterError) {
      throw error;
    }
    const code = errorCode(error);
    throw new AdapterError(
      code === 'EACCES' || code === 'EPERM' ? 'PERMISSION_DENIED' : 'ROOT_NOT_FOUND',
      '.',
      code === 'EACCES' || code === 'EPERM'
        ? 'Permission was denied while opening the selected root.'
        : 'The selected monorepo root does not exist.',
    );
  }
}

export async function readUtf8File(
  root: string,
  absolutePath: string,
  readTextFile: ReadTextFile = defaultReadTextFile,
): Promise<string> {
  const relativePath = repositoryRelativePath(root, absolutePath);
  try {
    return await readTextFile(absolutePath);
  } catch (error) {
    const code = errorCode(error);
    const adapterCode =
      code === 'EACCES' || code === 'EPERM'
        ? 'PERMISSION_DENIED'
        : code === 'ENOENT'
          ? 'MISSING_FILE'
          : 'READ_FAILED';
    throw new AdapterError(
      adapterCode,
      relativePath,
      adapterCode === 'PERMISSION_DENIED'
        ? 'Permission was denied while reading the file.'
        : adapterCode === 'MISSING_FILE'
          ? 'The required file does not exist.'
          : 'The file could not be read.',
    );
  }
}

export async function readJsonFile(root: string, absolutePath: string): Promise<unknown> {
  const relativePath = repositoryRelativePath(root, absolutePath);
  const text = await readUtf8File(root, absolutePath);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AdapterError('INVALID_JSON', relativePath, 'The file is not valid JSON.');
  }
}
