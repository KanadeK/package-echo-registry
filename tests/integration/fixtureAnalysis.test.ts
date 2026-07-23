import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { loadAnalysisInput } from '../../src/adapters/fsMonorepoAdapter.js';
import { analyzeImpact } from '../../src/core/analyzeImpact.js';

const fixtureRoot = fileURLToPath(new URL('../../examples/fixture-monorepo', import.meta.url));

describe('synthetic monorepo adapter', () => {
  it('imports five packages, three apps, two Changesets, API reports, and source usages', async () => {
    const input = await loadAnalysisInput({
      root: fixtureRoot,
    });

    expect(input.manifests).toHaveLength(8);
    expect(input.manifests.filter((manifest) => manifest.kind !== 'example')).toHaveLength(5);
    expect(input.manifests.filter((manifest) => manifest.kind === 'example')).toHaveLength(3);
    expect(input.changesets).toHaveLength(2);
    expect(input.previousApiSnapshots).toHaveLength(5);
    expect(input.currentApiSnapshots).toHaveLength(5);
    expect(input.sourceUsages).toContainEqual({
      consumerName: '@echo/react',
      consumerFile: 'packages/react/src/EnvelopeView.tsx',
      importedPackage: '@echo/core',
      importedMembers: ['parseEnvelope'],
      line: 1,
    });
  });

  it('produces concrete breaking, peer, example, and migration evidence offline', async () => {
    const input = await loadAnalysisInput({
      root: fixtureRoot,
    });
    const report = analyzeImpact(input, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    expect(report.summary.packages).toBe(5);
    expect(report.summary.examples).toBe(3);
    expect(report.summary.breakingChanges).toBe(2);
    expect(report.impacts).toContainEqual(
      expect.objectContaining({
        changeType: 'api-removed',
        changedPackage: '@echo/core',
        targetPackage: '@echo/react',
        sourceLocation: {
          path: 'packages/react/src/EnvelopeView.tsx',
          line: 1,
        },
      }),
    );
    expect(report.impacts).toContainEqual(
      expect.objectContaining({
        changeType: 'peer-range-incompatible',
        targetPackage: '@echo/react',
      }),
    );
    expect(report.impacts).toContainEqual(
      expect.objectContaining({
        evidencePath: ['@echo/core', '@echo/react', '@echo/catalog-app'],
        riskType: 'example-breakage',
      }),
    );
    expect(report.migrationTasks.some((task) => task.changedPackage === '@echo/node-adapter')).toBe(
      false,
    );
    expect(report.migrationTasks.some((task) => task.changedPackage === '@echo/theme')).toBe(false);
  });

  it('keeps every fixture impact attached to repository-relative evidence', async () => {
    const input = await loadAnalysisInput({
      root: fixtureRoot,
    });
    const report = analyzeImpact(input, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    for (const impact of report.impacts) {
      expect(impact.evidence.length).toBeGreaterThan(0);
      expect(impact.evidence.every((item) => !item.path.includes(fixtureRoot))).toBe(true);
      expect(impact.evidencePath.at(0)).toBe(impact.changedPackage);
      expect(impact.evidencePath.at(-1)).toBe(impact.targetPackage);
    }
  });
});
