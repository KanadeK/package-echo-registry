import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadAnalysisInput } from '../adapters/fsMonorepoAdapter.js';
import { parseReportJson, serializeReportJson } from '../adapters/reportImportAdapter.js';
import { analyzeImpact } from '../core/analyzeImpact.js';
import type { AnalysisReport } from '../core/model.js';
import { renderMarkdownReport } from '../core/reportExport.js';

export interface AnalyzeCommandOptions {
  root: string;
  output: string;
  previousApiDirectory: string;
  currentApiDirectory: string;
  generatedAt?: string;
}

function clockFromOption(generatedAt: string | undefined): () => Date {
  if (!generatedAt) {
    return () => new Date();
  }
  const timestamp = new Date(generatedAt);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('--generated-at must be an ISO 8601 timestamp.');
  }
  return () => new Date(timestamp);
}

export async function analyzeRepository(options: AnalyzeCommandOptions): Promise<{
  report: AnalysisReport;
  jsonPath: string;
  markdownPath: string;
}> {
  const input = await loadAnalysisInput({
    root: options.root,
    previousApiDirectory: options.previousApiDirectory,
    currentApiDirectory: options.currentApiDirectory,
  });
  const report = analyzeImpact(input, {
    now: clockFromOption(options.generatedAt),
  });
  const output = path.resolve(options.output);
  await mkdir(output, {
    recursive: true,
  });
  const jsonPath = path.join(output, 'package-echo-report.json');
  const markdownPath = path.join(output, 'package-echo-report.md');
  await Promise.all([
    writeFile(jsonPath, serializeReportJson(report), 'utf8'),
    writeFile(markdownPath, renderMarkdownReport(report), 'utf8'),
  ]);

  return {
    report,
    jsonPath,
    markdownPath,
  };
}

export async function validateReportFile(reportPath: string): Promise<AnalysisReport> {
  const text = await readFile(path.resolve(reportPath), 'utf8');
  return parseReportJson(text);
}
