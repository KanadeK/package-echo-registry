import { createServer } from 'node:net';

import { preview } from 'vite';

async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Could not allocate a local preview port.'));
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

export async function startBuiltPreview(repositoryRoot: string): Promise<{
  baseURL: string;
  close: () => Promise<void>;
}> {
  const port = await findAvailablePort();
  const server = await preview({
    logLevel: 'warn',
    preview: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
    root: repositoryRoot,
  });

  return {
    baseURL: `http://127.0.0.1:${port}`,
    close: async () => server.close(),
  };
}
