import { spawnSync } from 'node:child_process';
import process from 'node:process';

const tasks = ['format', 'lint', 'typecheck', 'test:coverage'];

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

if (process.argv.includes('--probe')) {
  process.exit(runNpm(['--version'], 'pipe'));
}

for (const task of tasks) {
  const status = runNpm(['run', task]);

  if (status !== 0) {
    process.exit(status);
  }
}
