export interface Envelope {
  id: string;
  source: string;
}

export function decodeEnvelope(value: string): Envelope {
  const parsed = JSON.parse(value) as {
    id: string;
    source: string;
  };
  return {
    id: parsed.id,
    source: parsed.source,
  };
}
