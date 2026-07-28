import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

import { parseDocument } from 'yaml';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const workflowDirectory = path.join(repositoryRoot, '.github', 'workflows');
const expectedFiles = ['ci.yml', 'pages.yml', 'release.yml', 'security.yml'];
const allowedActions = new Set([
  'actions/checkout@v4',
  'actions/configure-pages@v5',
  'actions/dependency-review-action@v4',
  'actions/deploy-pages@v4',
  'actions/setup-node@v4',
  'actions/upload-artifact@v4',
  'actions/upload-pages-artifact@v4',
]);
const requiredContent = {
  'ci.yml': [
    'npm run format',
    'npm run lint',
    'npm run typecheck',
    'npm run test:coverage',
    'npm run test:e2e',
    'npm run build',
    'npm run package',
  ],
  'pages.yml': ['npm run build', 'actions/deploy-pages@v4'],
  'release.yml': [
    "tags:\n      - 'v*'",
    'npm run package',
    'npm run release-check',
    'gh release create',
  ],
  'security.yml': [
    'npm audit --audit-level=high',
    'npm run secret:scan',
    'actions/dependency-review-action@v4',
  ],
};

function collectActionReferences(value, references = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectActionReferences(item, references);
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'uses' && typeof item === 'string') {
        references.push(item);
      } else {
        collectActionReferences(item, references);
      }
    }
  }
  return references;
}

export async function checkWorkflows() {
  const actualFiles = (await readdir(workflowDirectory))
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      `Expected workflows ${expectedFiles.join(', ')}, found ${actualFiles.join(', ')}.`,
    );
  }

  const failures = [];
  for (const file of actualFiles) {
    const source = await readFile(path.join(workflowDirectory, file), 'utf8');
    const document = parseDocument(source, { uniqueKeys: true });
    if (document.errors.length > 0) {
      failures.push(`${file}: ${document.errors.map((error) => error.message).join('; ')}`);
      continue;
    }

    if (source.includes('continue-on-error')) {
      failures.push(`${file}: continue-on-error is forbidden.`);
    }
    if (source.includes('pull_request_target')) {
      failures.push(`${file}: pull_request_target is forbidden.`);
    }
    for (const required of requiredContent[file]) {
      if (!source.includes(required)) {
        failures.push(`${file}: missing required gate ${JSON.stringify(required)}.`);
      }
    }

    for (const action of collectActionReferences(document.toJS())) {
      if (!allowedActions.has(action)) {
        failures.push(`${file}: unapproved or unpinned action ${action}.`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }
  process.stdout.write(`Validated ${actualFiles.length} GitHub Actions workflows.\n`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await checkWorkflows();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
