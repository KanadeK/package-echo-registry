import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const verifyScript = fileURLToPath(new URL('../../scripts/verify.mjs', import.meta.url));

describe('cross-platform verification runner', () => {
  it('can invoke the active npm installation without relying on PowerShell script policy', () => {
    const result = spawnSync(process.execPath, [verifyScript, '--probe'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: process.env,
    });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  });
});
