import path from 'node:path';

import { AdapterError } from './errors.js';

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function resolveWithinRoot(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(resolvedRoot, candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new AdapterError(
      'PATH_OUTSIDE_ROOT',
      toPosixPath(candidate),
      'The requested path leaves the selected monorepo root.',
    );
  }

  return resolvedCandidate;
}

export function repositoryRelativePath(root: string, candidate: string): string {
  const resolved = resolveWithinRoot(root, candidate);
  const relative = path.relative(path.resolve(root), resolved);
  return toPosixPath(relative || '.');
}
