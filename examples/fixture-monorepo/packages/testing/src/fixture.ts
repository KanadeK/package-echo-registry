import { parseEnvelope } from '@echo/core';

export function runFixture(payload: string) {
  return parseEnvelope(payload);
}
