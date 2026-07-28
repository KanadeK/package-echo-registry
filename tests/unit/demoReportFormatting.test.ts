import { format } from 'prettier';
import { describe, expect, it } from 'vitest';

import { formatDemoReportJson } from '../../scripts/formatDemoReport.js';

describe('demo report formatting regression', () => {
  it('emits JSON that remains stable under the repository formatter', async () => {
    const raw = JSON.stringify({
      evidencePath: ['@echo/core', '@echo/react', '@echo/catalog-app'],
      summary: {
        impacts: 11,
      },
    });
    const formatted = await formatDemoReportJson(raw);

    expect(await format(formatted, { parser: 'json' })).toBe(formatted);
    expect(JSON.parse(formatted)).toMatchObject({
      summary: {
        impacts: 11,
      },
    });
  });
});
