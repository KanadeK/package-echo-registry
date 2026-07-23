import { decodeEnvelope } from '@echo/core';

export function createTransport(payload: string) {
  return decodeEnvelope(payload);
}

export function createBatchTransport(payloads: string[]) {
  return payloads.map((payload) => decodeEnvelope(payload));
}
