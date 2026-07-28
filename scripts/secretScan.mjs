import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

import fg from 'fast-glob';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const ignored = [
  '.git/**',
  'coverage/**',
  'dist/**',
  'dist-cli/**',
  'dist-demo/**',
  'dist-release/**',
  'node_modules/**',
  'playwright-report/**',
  'test-results/**',
];
const binaryExtensions = new Set([
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.tgz',
  '.webp',
  '.zip',
]);
const patterns = [
  {
    label: 'GitHub token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    label: 'npm token',
    pattern: /\bnpm_[A-Za-z0-9]{20,}\b/g,
  },
  {
    label: 'AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    label: 'private key block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
];

export async function scanRepositoryForSecrets() {
  const files = await fg('**/*', {
    absolute: true,
    cwd: repositoryRoot,
    dot: true,
    followSymbolicLinks: false,
    ignore: ignored,
    onlyFiles: true,
    unique: true,
  });
  const findings = [];
  let scannedFiles = 0;

  for (const file of files.sort((left, right) => left.localeCompare(right))) {
    if (binaryExtensions.has(path.extname(file).toLowerCase())) {
      continue;
    }
    const content = await readFile(file, 'utf8');
    scannedFiles += 1;
    for (const { label, pattern } of patterns) {
      pattern.lastIndex = 0;
      for (const match of content.matchAll(pattern)) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        findings.push(
          `${path.relative(repositoryRoot, file).split(path.sep).join('/')}:${line}: ${label}`,
        );
      }
    }
  }

  if (findings.length > 0) {
    throw new Error(`Potential secrets found:\n${findings.join('\n')}`);
  }
  process.stdout.write(`Secret scan passed for ${scannedFiles} text files.\n`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await scanRepositoryForSecrets();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
