import { createBatchTransport } from '@echo/node-adapter';

export function runWorker(payloads: string[]) {
  return createBatchTransport(payloads);
}
