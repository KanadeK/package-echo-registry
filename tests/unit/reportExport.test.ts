import { describe, expect, it } from 'vitest';

import { analyzeImpact } from '../../src/core/analyzeImpact.js';
import type { AnalysisInput } from '../../src/core/model.js';
import { renderMarkdownReport } from '../../src/core/reportExport.js';
import { reportSchema } from '../../src/core/schema.js';
import type { AnalysisReport } from '../../src/core/model.js';

const minimalInput: AnalysisInput = {
  changesets: [],
  currentApiSnapshots: [
    {
      members: [],
      packageName: '@echo/core',
      packageVersion: '2.0.0',
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
      version: '2.0.0',
    },
    {
      dependencies: {},
      devDependencies: {},
      kind: 'consumer',
      name: '@echo/host',
      peerDependencies: {
        '@echo/core': '^1.0.0',
      },
      relativePath: 'apps/host/package.json',
      version: '0.0.0',
    },
  ],
  previousApiSnapshots: [
    {
      members: [],
      packageName: '@echo/core',
      packageVersion: '1.0.0',
      relativePath: 'api/previous.json',
    },
  ],
  rootLabel: 'fixture',
  sourceUsages: [],
};

describe('report schema and Markdown export', () => {
  it('round-trips the report through the public schema', () => {
    const report = analyzeImpact(minimalInput, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });

    expect(reportSchema.parse(JSON.parse(JSON.stringify(report)))).toEqual(report);
  });

  it('renders evidence paths and migration tasks as reviewable Markdown', () => {
    const report = analyzeImpact(minimalInput, {
      now: () => new Date('2026-07-23T12:00:00.000Z'),
    });
    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain('@echo/core -> @echo/host');
    expect(markdown).toContain('apps/host/package.json');
    expect(markdown).toContain('Migration checklist');
    expect(markdown).not.toContain('undefined');
  });

  it('renders explicit empty states for a clean analysis', () => {
    const emptyReport: AnalysisReport = {
      formatVersion: 1,
      toolVersion: '0.1.0',
      generatedAt: '2026-07-23T12:00:00.000Z',
      rootLabel: 'clean-fixture',
      summary: {
        packages: 1,
        consumers: 0,
        examples: 0,
        changes: 0,
        breakingChanges: 0,
        impacts: 0,
        migrationTasks: 0,
      },
      graph: {
        nodes: [],
        edges: [],
      },
      changes: [],
      impacts: [],
      migrationTasks: [],
    };

    const markdown = renderMarkdownReport(emptyReport);
    expect(markdown).toContain('No downstream impacts were detected.');
    expect(markdown).toContain('No migration tasks were generated.');
  });
});
