import { EnvelopeView } from '@echo/react';
import { runFixture } from '@echo/testing';

export function LegacyApp() {
  const fixture = runFixture('{"id":"legacy"}');
  return <EnvelopeView value={JSON.stringify(fixture)} />;
}
