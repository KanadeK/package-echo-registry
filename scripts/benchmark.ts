import { availableParallelism, cpus, platform, release, totalmem } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { chromium } from '@playwright/test';

import { loadAnalysisInput } from '../src/adapters/fsMonorepoAdapter.js';
import { analyzeImpact } from '../src/core/analyzeImpact.js';
import { startBuiltPreview } from './previewHarness.js';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const fixtureRoot = path.join(repositoryRoot, 'examples', 'fixture-monorepo');
const analysisIterations = 25;
const browserIterations = 7;

interface SampleSummary {
  iterations: number;
  maximumMs: number;
  medianMs: number;
  minimumMs: number;
  p95Ms: number;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function summarize(samples: number[]): SampleSummary {
  const sorted = [...samples].sort((left, right) => left - right);
  const at = (ratio: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0;
  return {
    iterations: samples.length,
    maximumMs: round(sorted.at(-1) ?? 0),
    medianMs: round(at(0.5)),
    minimumMs: round(sorted[0] ?? 0),
    p95Ms: round(at(0.95)),
  };
}

async function analyzeFixture(): Promise<{
  durationMs: number;
  input: Awaited<ReturnType<typeof loadAnalysisInput>>;
  report: ReturnType<typeof analyzeImpact>;
}> {
  const startedAt = performance.now();
  const input = await loadAnalysisInput({ root: fixtureRoot });
  const report = analyzeImpact(input, {
    now: () => new Date('2026-07-23T12:00:00.000Z'),
  });
  return {
    durationMs: performance.now() - startedAt,
    input,
    report,
  };
}

for (let index = 0; index < 3; index += 1) {
  await analyzeFixture();
}

const analysisSamples: number[] = [];
let finalAnalysis = await analyzeFixture();
for (let index = 0; index < analysisIterations; index += 1) {
  finalAnalysis = await analyzeFixture();
  analysisSamples.push(finalAnalysis.durationMs);
}

const preview = await startBuiltPreview(repositoryRoot);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  reducedMotion: 'reduce',
  viewport: {
    height: 900,
    width: 1440,
  },
});
const browserSamples: number[] = [];
let firstBrowserLoadMs = 0;
try {
  for (let index = 0; index < browserIterations + 1; index += 1) {
    const startedAt = performance.now();
    await page.goto(`${preview.baseURL}/?benchmark=${index}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByText('11 matching results').waitFor();
    const duration = performance.now() - startedAt;
    if (index === 0) {
      firstBrowserLoadMs = duration;
    } else {
      browserSamples.push(duration);
    }
  }
} finally {
  await browser.close();
  await preview.close();
}

const result = {
  analysis: summarize(analysisSamples),
  fixture: {
    apiSnapshots:
      finalAnalysis.input.previousApiSnapshots.length +
      finalAnalysis.input.currentApiSnapshots.length,
    changesets: finalAnalysis.input.changesets.length,
    graphEdges: finalAnalysis.report.graph.edges.length,
    graphNodes: finalAnalysis.report.graph.nodes.length,
    impacts: finalAnalysis.report.impacts.length,
    manifests: finalAnalysis.input.manifests.length,
    migrationTasks: finalAnalysis.report.migrationTasks.length,
    sourceUsages: finalAnalysis.input.sourceUsages.length,
  },
  machine: {
    cpu: cpus()[0]?.model.trim() ?? 'unknown',
    logicalCpus: availableParallelism(),
    memoryGiB: round(totalmem() / 1024 ** 3),
    node: process.version,
    os: `${platform()} ${release()}`,
  },
  measuredAt: new Date().toISOString(),
  web: {
    firstLoadMs: round(firstBrowserLoadMs),
    warmLoads: summarize(browserSamples),
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
