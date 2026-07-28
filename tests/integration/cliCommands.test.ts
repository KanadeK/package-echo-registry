import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { analyzeRepository, validateReportFile } from '../../src/cli/commands.js';

const fixtureRoot = fileURLToPath(new URL('../../examples/fixture-monorepo', import.meta.url));
let outputRoot: string;

beforeEach(async () => {
  outputRoot = await mkdtemp(path.join(tmpdir(), 'package-echo-output-'));
});

afterEach(async () => {
  await rm(outputRoot, { force: true, recursive: true });
});

describe('CLI command service', () => {
  it('writes and validates real JSON and Markdown reports from the fixture', async () => {
    const result = await analyzeRepository({
      root: fixtureRoot,
      output: outputRoot,
      previousApiDirectory: 'api-reports/previous',
      currentApiDirectory: 'api-reports/current',
      generatedAt: '2026-07-23T12:00:00.000Z',
    });
    const [json, markdown, validated] = await Promise.all([
      readFile(result.jsonPath, 'utf8'),
      readFile(result.markdownPath, 'utf8'),
      validateReportFile(result.jsonPath),
    ]);

    expect(JSON.parse(json)).toMatchObject({
      generatedAt: '2026-07-23T12:00:00.000Z',
      summary: {
        impacts: 11,
        migrationTasks: 11,
      },
    });
    expect(markdown).toContain('@echo/core -> @echo/react -> @echo/catalog-app');
    expect(validated.summary.impacts).toBe(11);
  });

  it('rejects an invalid injected clock instead of producing unstable output', async () => {
    await expect(
      analyzeRepository({
        root: fixtureRoot,
        output: outputRoot,
        previousApiDirectory: 'api-reports/previous',
        currentApiDirectory: 'api-reports/current',
        generatedAt: 'not-a-timestamp',
      }),
    ).rejects.toThrow(/ISO 8601 timestamp/);
  });
});
