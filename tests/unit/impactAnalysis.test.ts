import { describe, expect, it } from 'vitest';

import { analyzeImpact } from '../../src/core/analyzeImpact.js';
import type { AnalysisInput } from '../../src/core/model.js';

const analysisInput: AnalysisInput = {
  changesets: [
    {
      id: 'remove-parser',
      relativePath: '.changeset/remove-parser.md',
      releases: [
        {
          name: '@echo/core',
          type: 'major',
        },
      ],
      summary: 'Replace parseWidget with decodeWidget.',
    },
  ],
  currentApiSnapshots: [
    {
      members: [
        {
          id: '@echo/core!decodeWidget:function(1)',
          kind: 'Function',
          name: 'decodeWidget',
          signature: 'export declare function decodeWidget(value: string): Widget;',
        },
      ],
      packageName: '@echo/core',
      packageVersion: '2.0.0',
      relativePath: 'api-reports/current/echo-core.api.json',
    },
    {
      members: [],
      packageName: '@echo/stable',
      packageVersion: '1.0.0',
      relativePath: 'api-reports/current/echo-stable.api.json',
    },
  ],
  manifests: [
    {
      dependencies: {},
      devDependencies: {},
      kind: 'package',
      name: '@echo/core',
      peerDependencies: {},
      relativePath: 'packages/core/package.json',
      version: '2.0.0',
    },
    {
      dependencies: {},
      devDependencies: {},
      kind: 'package',
      name: '@echo/stable',
      peerDependencies: {},
      relativePath: 'packages/stable/package.json',
      version: '1.0.0',
    },
    {
      dependencies: {
        '@echo/core': 'workspace:^',
      },
      devDependencies: {},
      kind: 'consumer',
      name: '@echo/react',
      peerDependencies: {},
      relativePath: 'packages/react/package.json',
      version: '1.4.0',
    },
    {
      dependencies: {
        '@echo/react': 'workspace:*',
      },
      devDependencies: {},
      kind: 'example',
      name: '@echo/catalog-app',
      peerDependencies: {},
      relativePath: 'apps/catalog/package.json',
      version: '0.0.0',
    },
    {
      dependencies: {},
      devDependencies: {},
      kind: 'consumer',
      name: '@echo/legacy-host',
      peerDependencies: {
        '@echo/core': '^1.0.0',
      },
      relativePath: 'apps/legacy-host/package.json',
      version: '0.0.0',
    },
  ],
  previousApiSnapshots: [
    {
      members: [
        {
          id: '@echo/core!parseWidget:function(1)',
          kind: 'Function',
          name: 'parseWidget',
          signature: 'export declare function parseWidget(value: string): Widget;',
        },
      ],
      packageName: '@echo/core',
      packageVersion: '1.0.0',
      relativePath: 'api-reports/previous/echo-core.api.json',
    },
    {
      members: [],
      packageName: '@echo/stable',
      packageVersion: '1.0.0',
      relativePath: 'api-reports/previous/echo-stable.api.json',
    },
  ],
  rootLabel: 'synthetic-monorepo',
  sourceUsages: [
    {
      consumerFile: 'packages/react/src/legacy.ts',
      consumerName: '@echo/react',
      importedMembers: ['parseWidget'],
      importedPackage: '@echo/core',
      line: 3,
    },
    {
      consumerFile: 'apps/catalog/src/main.tsx',
      consumerName: '@echo/catalog-app',
      importedMembers: ['WidgetCard'],
      importedPackage: '@echo/react',
      line: 2,
    },
  ],
};

describe('impact analysis', () => {
  it('locates a breaking API at a concrete consumer file and propagates it to examples', () => {
    const report = analyzeImpact(analysisInput, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    const directImpact = report.impacts.find(
      (impact) => impact.changeType === 'api-removed' && impact.targetPackage === '@echo/react',
    );
    const exampleImpact = report.impacts.find(
      (impact) =>
        impact.changeType === 'api-removed' && impact.targetPackage === '@echo/catalog-app',
    );

    expect(directImpact).toMatchObject({
      evidencePath: ['@echo/core', '@echo/react'],
      sourceLocation: {
        line: 3,
        path: 'packages/react/src/legacy.ts',
      },
    });
    expect(exampleImpact).toMatchObject({
      evidencePath: ['@echo/core', '@echo/react', '@echo/catalog-app'],
      riskType: 'example-breakage',
    });
    expect(exampleImpact?.evidence.some((item) => item.path === 'apps/catalog/package.json')).toBe(
      true,
    );
  });

  it('reports an incompatible peer range with manifest evidence', () => {
    const report = analyzeImpact(analysisInput, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    expect(report.impacts).toContainEqual(
      expect.objectContaining({
        changeType: 'peer-range-incompatible',
        evidencePath: ['@echo/core', '@echo/legacy-host'],
        riskType: 'peer-dependency',
        targetPackage: '@echo/legacy-host',
      }),
    );
  });

  it('does not generate migration work for an unchanged package', () => {
    const report = analyzeImpact(analysisInput, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    expect(report.migrationTasks.some((task) => task.changedPackage === '@echo/stable')).toBe(
      false,
    );
    expect(report.changes.some((change) => change.packageName === '@echo/stable')).toBe(false);
  });

  it('keeps every impact evidence-backed and deterministic', () => {
    const report = analyzeImpact(analysisInput, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    expect(report.generatedAt).toBe('2026-07-23T12:00:00.000Z');
    expect(report.impacts.length).toBeGreaterThan(0);
    for (const impact of report.impacts) {
      expect(impact.evidencePath.length).toBeGreaterThanOrEqual(2);
      expect(impact.evidence.length).toBeGreaterThan(0);
      expect(impact.evidence.every((item) => item.path.length > 0)).toBe(true);
    }
  });

  it('keeps graph evidence when no matching source usage exists', () => {
    const report = analyzeImpact(
      {
        ...analysisInput,
        sourceUsages: [],
      },
      {
        now: () => new Date('2026-07-23T12:00:00.000Z'),
      },
    );
    const impact = report.impacts.find(
      (candidate) =>
        candidate.changeType === 'api-removed' && candidate.targetPackage === '@echo/react',
    );

    expect(impact?.sourceLocation).toBeUndefined();
    expect(impact?.evidence).toContainEqual(
      expect.objectContaining({
        kind: 'manifest',
        path: 'packages/react/package.json',
      }),
    );
  });

  it('does not create impacts for additions, missing current snapshots, or compatible peers', () => {
    const input: AnalysisInput = {
      changesets: [
        {
          id: 'external-release',
          relativePath: '.changeset/external-release.md',
          releases: [
            {
              name: '@echo/not-loaded',
              type: 'patch',
            },
          ],
          summary: 'Document an external package release.',
        },
      ],
      currentApiSnapshots: [
        {
          members: [
            {
              id: '@echo/core!newMember:function(1)',
              kind: 'Function',
              name: 'newMember',
              signature: 'export declare function newMember(): void;',
            },
          ],
          packageName: '@echo/core',
          packageVersion: '1.1.0',
          relativePath: 'api/current.json',
        },
      ],
      manifests: [
        {
          dependencies: {},
          devDependencies: {},
          kind: 'package',
          name: '@echo/core',
          peerDependencies: {},
          relativePath: 'packages/core/package.json',
          version: '1.1.0',
        },
        {
          dependencies: {},
          devDependencies: {},
          kind: 'consumer',
          name: '@echo/compatible',
          peerDependencies: {
            '@echo/core': '^1.0.0',
          },
          relativePath: 'packages/compatible/package.json',
          version: '1.0.0',
        },
      ],
      previousApiSnapshots: [
        {
          members: [],
          packageName: '@echo/core',
          packageVersion: '1.0.0',
          relativePath: 'api/previous.json',
        },
        {
          members: [],
          packageName: '@echo/not-loaded',
          packageVersion: '1.0.0',
          relativePath: 'api/not-loaded.json',
        },
      ],
      rootLabel: 'safe-input',
      sourceUsages: [],
    };
    const report = analyzeImpact(input, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    expect(report.impacts).toEqual([]);
    expect(report.migrationTasks).toEqual([]);
    expect(report.changes).toContainEqual(
      expect.objectContaining({
        changeType: 'api-added',
        packageName: '@echo/core',
      }),
    );
    expect(report.changes).toContainEqual(
      expect.objectContaining({
        changeType: 'release-intent',
        currentVersion: 'unknown',
        packageName: '@echo/not-loaded',
      }),
    );
  });

  it('ignores peer checks for non-semantic workspace versions', () => {
    const input: AnalysisInput = {
      changesets: [],
      currentApiSnapshots: [],
      manifests: [
        {
          dependencies: {},
          devDependencies: {},
          kind: 'package',
          name: '@echo/unversioned',
          peerDependencies: {},
          relativePath: 'packages/unversioned/package.json',
          version: 'workspace',
        },
        {
          dependencies: {},
          devDependencies: {},
          kind: 'consumer',
          name: '@echo/host',
          peerDependencies: {
            '@echo/unversioned': '^1.0.0',
          },
          relativePath: 'packages/host/package.json',
          version: '1.0.0',
        },
      ],
      previousApiSnapshots: [],
      rootLabel: 'invalid-version',
      sourceUsages: [],
    };

    expect(
      analyzeImpact(input, {
        now: () => new Date('2026-07-23T12:00:00.000Z'),
      }).impacts,
    ).toEqual([]);
  });
});
