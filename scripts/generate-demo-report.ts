import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { loadAnalysisInput } from '../src/adapters/fsMonorepoAdapter.js';
import { serializeReportJson } from '../src/adapters/reportImportAdapter.js';
import { analyzeImpact } from '../src/core/analyzeImpact.js';
import { renderMarkdownReport } from '../src/core/reportExport.js';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const fixtureRoot = path.join(repositoryRoot, 'examples', 'fixture-monorepo');
const publicDirectory = path.join(repositoryRoot, 'public');
const demoDirectory = path.join(repositoryRoot, 'dist-demo');

const input = await loadAnalysisInput({
  root: fixtureRoot,
});
const report = analyzeImpact(input, {
  now: () => new Date('2026-07-23T12:00:00.000Z'),
});

await Promise.all([
  mkdir(publicDirectory, {
    recursive: true,
  }),
  mkdir(demoDirectory, {
    recursive: true,
  }),
]);
await Promise.all([
  writeFile(path.join(publicDirectory, 'demo-report.json'), serializeReportJson(report), 'utf8'),
  writeFile(
    path.join(demoDirectory, 'package-echo-report.json'),
    serializeReportJson(report),
    'utf8',
  ),
  writeFile(
    path.join(demoDirectory, 'package-echo-report.md'),
    renderMarkdownReport(report),
    'utf8',
  ),
]);

process.stdout.write(
  `Generated ${report.impacts.length} impacts and ${report.migrationTasks.length} migration tasks from ${input.rootLabel}.\n`,
);
