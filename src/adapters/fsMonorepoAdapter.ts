import path from 'node:path';

import type { AnalysisInput } from '../core/model.js';
import { readApiSnapshots } from './apiExtractorAdapter.js';
import { readChangesets } from './changesetAdapter.js';
import { assertDirectory } from './fileReader.js';
import { readWorkspaceManifests } from './manifestAdapter.js';
import { readSourceUsages } from './sourceUsageAdapter.js';

export interface FileAnalysisOptions {
  root: string;
  previousApiDirectory?: string;
  currentApiDirectory?: string;
}

export async function loadAnalysisInput(options: FileAnalysisOptions): Promise<AnalysisInput> {
  const root = path.resolve(options.root);
  await assertDirectory(root);
  const manifests = await readWorkspaceManifests(root);
  const currentVersions = new Map(manifests.map((manifest) => [manifest.name, manifest.version]));
  const previousApiDirectory = options.previousApiDirectory ?? 'api-reports/previous';
  const currentApiDirectory = options.currentApiDirectory ?? 'api-reports/current';
  const [changesets, previousApiSnapshots, currentApiSnapshots, sourceUsages] = await Promise.all([
    readChangesets(root),
    readApiSnapshots(root, previousApiDirectory, new Map()),
    readApiSnapshots(root, currentApiDirectory, currentVersions),
    readSourceUsages(root, manifests),
  ]);

  return {
    rootLabel: path.basename(root),
    manifests,
    previousApiSnapshots,
    currentApiSnapshots,
    changesets,
    sourceUsages,
  };
}
