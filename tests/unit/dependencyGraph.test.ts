import { describe, expect, it } from 'vitest';

import {
  buildDownstreamGraph,
  evidenceForPath,
  findEvidencePath,
  listDownstreamTargets,
} from '../../src/core/dependencyGraph.js';
import type { PackageManifest } from '../../src/core/model.js';

const manifests: PackageManifest[] = [
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
      react: '^19.0.0',
    },
    devDependencies: {},
    kind: 'example',
    name: '@echo/catalog-app',
    peerDependencies: {},
    relativePath: 'apps/catalog/package.json',
    version: '0.0.0',
  },
];

describe('downstream graph', () => {
  it('orients workspace edges from package to consumer to example', () => {
    const graph = buildDownstreamGraph(manifests);

    expect(graph.nodes.map((node) => node.name)).toEqual([
      '@echo/catalog-app',
      '@echo/core',
      '@echo/react',
    ]);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        from: '@echo/core',
        relationship: 'dependency',
        to: '@echo/react',
      }),
      expect.objectContaining({
        from: '@echo/react',
        relationship: 'dependency',
        to: '@echo/catalog-app',
      }),
    ]);
  });

  it('returns the shortest evidence path and excludes public-registry dependencies', () => {
    const graph = buildDownstreamGraph(manifests);

    expect(findEvidencePath(graph, '@echo/core', '@echo/catalog-app')).toEqual([
      '@echo/core',
      '@echo/react',
      '@echo/catalog-app',
    ]);
    expect(graph.nodes.some((node) => node.name === 'react')).toBe(false);
  });

  it('handles same-node, missing-node, reverse, and cyclic path requests', () => {
    const graph = buildDownstreamGraph([
      ...manifests,
      {
        dependencies: {
          '@echo/react': 'workspace:*',
        },
        devDependencies: {
          '@echo/react': 'workspace:*',
        },
        kind: 'package',
        name: '@echo/cycle',
        peerDependencies: {},
        relativePath: 'packages/cycle/package.json',
        version: '1.0.0',
      },
      {
        dependencies: {
          '@echo/cycle': 'workspace:*',
        },
        devDependencies: {},
        kind: 'consumer',
        name: '@echo/disconnected',
        peerDependencies: {},
        relativePath: 'packages/disconnected/package.json',
        version: '1.0.0',
      },
    ]);

    expect(findEvidencePath(graph, '@echo/core', '@echo/core')).toEqual(['@echo/core']);
    expect(findEvidencePath(graph, '@echo/missing', '@echo/core')).toBeUndefined();
    expect(findEvidencePath(graph, '@echo/catalog-app', '@echo/core')).toBeUndefined();
    expect(listDownstreamTargets(graph, '@echo/core')).toContain('@echo/catalog-app');
    expect(evidenceForPath(graph, ['@echo/core', '@echo/missing'])).toEqual([]);
  });

  it('uses dependency precedence when a manifest repeats an internal package', () => {
    const graph = buildDownstreamGraph([
      manifests[0]!,
      {
        dependencies: {
          '@echo/core': 'workspace:^',
        },
        devDependencies: {
          '@echo/core': 'workspace:*',
        },
        kind: 'consumer',
        name: '@echo/repeated',
        peerDependencies: {
          '@echo/core': '^2.0.0',
        },
        relativePath: 'packages/repeated/package.json',
        version: '1.0.0',
      },
    ]);

    expect(graph.edges).toEqual([
      expect.objectContaining({
        relationship: 'dependency',
      }),
    ]);
  });
});
