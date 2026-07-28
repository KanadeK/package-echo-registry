import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

import { preview } from 'vite';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const playwrightCli = fileURLToPath(
  new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
);

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Could not allocate a local E2E port.'));
        return;
      }
      probe.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

function runPlaywright(baseURL) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, 'test'], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PACKAGE_ECHO_E2E_URL: baseURL,
      },
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

const port = await findAvailablePort();
const baseURL = `http://127.0.0.1:${port}`;
const server = await preview({
  logLevel: 'warn',
  preview: {
    host: '127.0.0.1',
    port,
    strictPort: true,
  },
  root: repositoryRoot,
});

let status;
try {
  process.stdout.write(`[e2e] preview ${baseURL}\n`);
  status = await runPlaywright(baseURL);
} finally {
  await server.close();
}

process.exit(status ?? 1);
