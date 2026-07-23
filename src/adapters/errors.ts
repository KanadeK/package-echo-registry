export type AdapterErrorCode =
  | 'INVALID_API_REPORT'
  | 'INVALID_CHANGESET'
  | 'INVALID_JSON'
  | 'INVALID_MANIFEST'
  | 'MISSING_FILE'
  | 'PATH_OUTSIDE_ROOT'
  | 'PERMISSION_DENIED'
  | 'READ_FAILED'
  | 'ROOT_NOT_FOUND';

export class AdapterError extends Error {
  readonly code: AdapterErrorCode;
  readonly relativePath: string;

  constructor(code: AdapterErrorCode, relativePath: string, detail: string) {
    super(`${code}: ${relativePath}: ${detail}`);
    this.name = 'AdapterError';
    this.code = code;
    this.relativePath = relativePath;
  }
}
