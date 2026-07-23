import { parseEnvelope } from '@echo/core';
import { themeTokens } from '@echo/theme';

export function EnvelopeView({ value }: { value: string }) {
  const envelope = parseEnvelope(value);
  return (
    <article style={{ color: themeTokens.foreground }}>
      <strong>{envelope.id}</strong>
    </article>
  );
}
