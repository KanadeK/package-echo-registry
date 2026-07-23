import { describe, expect, it } from 'vitest';

import { PROJECT_METADATA } from '../../src/core/projectMetadata.js';

describe('project metadata', () => {
  it('keeps the package, report, and release identities explicit', () => {
    expect(PROJECT_METADATA).toEqual({
      name: 'Package Echo Registry',
      packageName: 'package-echo-registry',
      version: '0.1.0',
      reportFormatVersion: 1,
    });
  });

  it('prevents runtime mutation of release metadata', () => {
    expect(Object.isFrozen(PROJECT_METADATA)).toBe(true);
  });
});
