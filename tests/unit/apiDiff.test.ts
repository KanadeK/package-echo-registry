import { describe, expect, it } from 'vitest';

import { diffApiSnapshots } from '../../src/core/apiDiff.js';
import type { ApiSnapshot } from '../../src/core/model.js';

const previous: ApiSnapshot = {
  packageName: '@echo/core',
  packageVersion: '1.0.0',
  relativePath: 'api-reports/previous/echo-core.api.json',
  members: [
    {
      id: '@echo/core!parseWidget:function(1)',
      kind: 'Function',
      name: 'parseWidget',
      signature: 'export declare function parseWidget(value: string): Widget;',
    },
    {
      id: '@echo/core!Widget:interface',
      kind: 'Interface',
      name: 'Widget',
      signature: 'export interface Widget { id: string; }',
    },
  ],
};

describe('API snapshot diff', () => {
  it('rejects snapshots from different packages', () => {
    expect(() =>
      diffApiSnapshots(previous, {
        ...previous,
        packageName: '@echo/other',
      }),
    ).toThrow('Cannot compare API snapshots');
  });

  it('classifies removed and changed public members as breaking', () => {
    const current: ApiSnapshot = {
      ...previous,
      packageVersion: '2.0.0',
      relativePath: 'api-reports/current/echo-core.api.json',
      members: [
        {
          id: '@echo/core!Widget:interface',
          kind: 'Interface',
          name: 'Widget',
          signature: 'export interface Widget { id: string; label: string; }',
        },
      ],
    };

    expect(diffApiSnapshots(previous, current)).toEqual([
      expect.objectContaining({
        changeType: 'api-removed',
        memberName: 'parseWidget',
        severity: 'high',
      }),
      expect.objectContaining({
        changeType: 'api-signature-changed',
        memberName: 'Widget',
        severity: 'high',
      }),
    ]);
  });

  it('records additions without turning them into migration work', () => {
    const current: ApiSnapshot = {
      ...previous,
      packageVersion: '1.1.0',
      relativePath: 'api-reports/current/echo-core.api.json',
      members: [
        ...previous.members,
        {
          id: '@echo/core!formatWidget:function(1)',
          kind: 'Function',
          name: 'formatWidget',
          signature: 'export declare function formatWidget(widget: Widget): string;',
        },
      ],
    };

    expect(diffApiSnapshots(previous, current)).toEqual([
      expect.objectContaining({
        changeType: 'api-added',
        memberName: 'formatWidget',
        severity: 'info',
      }),
    ]);
  });

  it('returns no changes for semantically identical signatures', () => {
    const current: ApiSnapshot = {
      ...previous,
      relativePath: 'api-reports/current/echo-core.api.json',
      members: previous.members.map((member) => ({
        ...member,
        signature: `  ${member.signature}  `,
      })),
    };

    expect(diffApiSnapshots(previous, current)).toEqual([]);
  });
});
