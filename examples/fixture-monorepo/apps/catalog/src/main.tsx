import { EnvelopeView } from '@echo/react';
import { themeTokens } from '@echo/theme';

export function CatalogApp() {
  return (
    <main style={{ background: themeTokens.background }}>
      <EnvelopeView value='{"id":"catalog","source":"fixture"}' />
    </main>
  );
}
