#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Command } from 'commander';

import { AdapterError } from '../adapters/errors.js';
import { PROJECT_METADATA } from '../core/projectMetadata.js';
import { analyzeRepository, validateReportFile } from './commands.js';

function writeAnalysisSummary(result: Awaited<ReturnType<typeof analyzeRepository>>): void {
  process.stdout.write(
    [
      `Analyzed ${result.report.rootLabel}.`,
      `${result.report.summary.changes} changes, ${result.report.summary.impacts} impacts, ${result.report.summary.migrationTasks} migration tasks.`,
      `JSON: ${result.jsonPath}`,
      `Markdown: ${result.markdownPath}`,
      '',
    ].join('\n'),
  );
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name('package-echo')
    .description('Trace package changes to downstream consumers, examples, and migration tasks.')
    .version(PROJECT_METADATA.version);

  program
    .command('analyze')
    .description('Analyze a local monorepo without contacting a public registry.')
    .argument('[root]', 'monorepo root', '.')
    .option('-o, --output <directory>', 'report output directory', 'dist-demo')
    .option(
      '--previous-api <directory>',
      'previous API Extractor report directory relative to root',
      'api-reports/previous',
    )
    .option(
      '--current-api <directory>',
      'current API Extractor report directory relative to root',
      'api-reports/current',
    )
    .option('--generated-at <timestamp>', 'inject an ISO timestamp for reproducible output')
    .action(
      async (
        root: string,
        options: {
          output: string;
          previousApi: string;
          currentApi: string;
          generatedAt?: string;
        },
      ) => {
        writeAnalysisSummary(
          await analyzeRepository({
            root,
            output: options.output,
            previousApiDirectory: options.previousApi,
            currentApiDirectory: options.currentApi,
            generatedAt: options.generatedAt,
          }),
        );
      },
    );

  program
    .command('demo')
    .description('Analyze the committed synthetic monorepo fixture.')
    .option('-o, --output <directory>', 'report output directory', 'dist-demo')
    .action(async (options: { output: string }) => {
      const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
      writeAnalysisSummary(
        await analyzeRepository({
          root: path.join(repositoryRoot, 'examples', 'fixture-monorepo'),
          output: options.output,
          previousApiDirectory: 'api-reports/previous',
          currentApiDirectory: 'api-reports/current',
          generatedAt: '2026-07-23T12:00:00.000Z',
        }),
      );
    });

  program
    .command('validate')
    .description('Validate a report schema, counts, graph paths, and evidence edges.')
    .argument('<report>', 'path to a Package Echo Registry JSON report')
    .action(async (reportPath: string) => {
      const report = await validateReportFile(reportPath);
      process.stdout.write(
        `Valid report: ${report.summary.impacts} impacts with ${report.migrationTasks.length} migration tasks.\n`,
      );
    });

  return program;
}

async function run(): Promise<void> {
  try {
    await createProgram().parseAsync(process.argv);
  } catch (error) {
    const message =
      error instanceof AdapterError || error instanceof Error
        ? error.message
        : 'Unexpected analysis failure.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  await run();
}
