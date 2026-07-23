import { describe, expect, it } from 'vitest';

import { createMigrationTasks } from '../../src/core/migrationPlan.js';
import type { Impact } from '../../src/core/model.js';

function impact(overrides: Partial<Impact> = {}): Impact {
  return {
    id: 'impact:change:consumer',
    changeId: 'change',
    changeType: 'api-removed',
    changedPackage: '@echo/core',
    targetPackage: '@echo/consumer',
    targetKind: 'consumer',
    severity: 'high',
    riskType: 'breaking-api',
    evidencePath: ['@echo/core', '@echo/consumer'],
    evidence: [
      {
        kind: 'manifest',
        path: 'packages/consumer/package.json',
        detail: 'Workspace dependency.',
      },
    ],
    ...overrides,
  };
}

describe('migration plan', () => {
  it('skips informational work and deduplicates repeated impacts', () => {
    const primary = impact();

    expect(
      createMigrationTasks([
        impact({
          severity: 'info',
        }),
        impact({
          severity: 'low',
        }),
        primary,
        {
          ...primary,
          id: 'impact:duplicate',
        },
      ]),
    ).toHaveLength(1);
  });

  it('uses a safe fallback label when a changed member is unavailable', () => {
    expect(createMigrationTasks([impact()])[0]).toMatchObject({
      title: 'Migrate @echo/consumer away from changed API',
    });
  });
});
