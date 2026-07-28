import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
const child = spawn(
  process.execPath,
  [tsxCli, 'src/cli/index.ts', 'demo', '--output', 'dist-demo'],
  {
    cwd: repositoryRoot,
    env: process.env,
    shell: false,
    stdio: 'inherit',
  },
);

child.once('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
child.once('close', (status) => process.exit(status ?? 1));
