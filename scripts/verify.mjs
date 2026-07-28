import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

import { build as viteBuild } from 'vite';

import { checkDocumentation } from './checkDocs.mjs';
import { checkFormatting, checkLint, checkTypeScript } from './qualityChecks.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const nodeModule = (relativePath) =>
  fileURLToPath(new URL(`../node_modules/${relativePath}`, import.meta.url));
const checks = [
  ['format', checkFormatting],
  ['lint', checkLint],
  ['typecheck', checkTypeScript],
  ['documentation', checkDocumentation],
  ['coverage', [nodeModule('vitest/vitest.mjs'), 'run', '--coverage']],
  ['demo report', [nodeModule('tsx/dist/cli.mjs'), 'scripts/generate-demo-report.ts']],
  ['production build', async () => viteBuild({ root: repositoryRoot })],
  ['end-to-end', ['scripts/runE2E.mjs']],
];

function runNpm(arguments_, stdio = 'inherit') {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const commandArguments = npmCli ? [npmCli, ...arguments_] : arguments_;
  const result = spawnSync(command, commandArguments, {
    env: process.env,
    shell: !npmCli && process.platform === 'win32',
    stdio,
  });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    return 1;
  }

  return result.status ?? 1;
}

function runNode(arguments_) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, arguments_, {
      cwd: repositoryRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });
    child.once('error', (error) => {
      process.stderr.write(`${error.message}\n`);
      resolve(1);
    });
    child.once('close', (status) => resolve(status ?? 1));
  });
}

if (process.argv.includes('--probe')) {
  process.exit(runNpm(['--version'], 'pipe'));
}

for (const [label, arguments_] of checks) {
  process.stdout.write(`\n[verify] ${label}\n`);
  try {
    if (typeof arguments_ === 'function') {
      await arguments_();
    } else {
      const status = await runNode(arguments_);
      if (status !== 0) {
        process.exit(status);
      }
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
