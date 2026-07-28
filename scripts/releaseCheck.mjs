import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

import fg from 'fast-glob';

import { scanRepositoryForSecrets } from './secretScan.mjs';
import { verifyAll } from './verify.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const developmentMode = process.argv.includes('--development');
const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
const slug = packageJson.name;

async function git(arguments_) {
  const result = await execFileAsync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return result.stdout.trim();
}

async function checkCleanHistory() {
  if (!developmentMode && (await git(['status', '--porcelain']))) {
    throw new Error('Release check requires a clean worktree.');
  }
  const branch = await git(['branch', '--show-current']);
  if (branch && branch !== 'main') {
    throw new Error('Release check must run on main or an exact release tag.');
  }
  if (!branch && (await git(['describe', '--exact-match', '--tags'])) !== `v${version}`) {
    throw new Error(`Detached release checks require the exact v${version} tag.`);
  }

  const authorMatch = String(packageJson.author).match(/^(.+) <([^>]+)>$/);
  if (!authorMatch) {
    throw new Error('package.json author must include the verified name and email.');
  }
  const expectedName = authorMatch[1];
  const expectedEmail = authorMatch[2];
  const identities = (await git(['log', '--format=%an%x00%ae%x00%cn%x00%ce']))
    .split(/\r?\n/)
    .filter(Boolean);
  for (const identity of identities) {
    const [authorName, authorEmail, committerName, committerEmail] = identity.split('\0');
    if (
      authorName !== expectedName ||
      authorEmail !== expectedEmail ||
      committerName !== expectedName ||
      committerEmail !== expectedEmail
    ) {
      throw new Error(`Unexpected commit identity: ${identity.replaceAll('\0', ' | ')}`);
    }
  }
  if (await git(['log', '--format=%B', '--grep=Co-authored-by'])) {
    throw new Error('Commit history contains a Co-authored-by trailer.');
  }
}

async function checkVersionsAndChangelog() {
  const packageLock = JSON.parse(
    await readFile(path.join(repositoryRoot, 'package-lock.json'), 'utf8'),
  );
  const metadata = await readFile(
    path.join(repositoryRoot, 'src', 'core', 'projectMetadata.ts'),
    'utf8',
  );
  const metadataVersion = metadata.match(/version:\s*'([^']+)'/)?.[1];
  if (
    packageLock.version !== version ||
    packageLock.packages?.['']?.version !== version ||
    metadataVersion !== version
  ) {
    throw new Error('package.json, package-lock.json, and project metadata versions differ.');
  }
  const changelog = await readFile(path.join(repositoryRoot, 'CHANGELOG.md'), 'utf8');
  if (!developmentMode && !changelog.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md does not contain a ${version} release section.`);
  }
}

async function checkForbiddenMarkers() {
  const inputHintMarker = ['place', 'holder'].join('');
  const markerNames = [
    ['TO', 'DO'].join(''),
    ['FIX', 'ME'].join(''),
    ['Not', 'Implemented'].join(''),
    inputHintMarker,
    ['coming', 'soon'].join(' '),
    ['lorem', 'ipsum'].join(' '),
  ];
  const files = await fg(['**/*.{css,html,js,json,md,mjs,ts,tsx,yaml,yml}', 'Makefile'], {
    absolute: true,
    cwd: repositoryRoot,
    dot: true,
    ignore: [
      '.git/**',
      'coverage/**',
      'dist/**',
      'dist-cli/**',
      'dist-demo/**',
      'dist-release/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
    onlyFiles: true,
  });
  const findings = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const relativeFile = path.relative(repositoryRoot, file).split(path.sep).join('/');
    for (const marker of markerNames) {
      const matchingLines = content
        .split(/\r?\n/)
        .map((line, index) => ({ index: index + 1, line }))
        .filter(({ line }) => line.toLowerCase().includes(marker.toLowerCase()));
      for (const match of matchingLines) {
        const allowedInputHint =
          marker === inputHintMarker &&
          relativeFile === 'src/App.tsx' &&
          match.line.includes(`${inputHintMarker}=`);
        if (!allowedInputHint) {
          findings.push(`${relativeFile}:${match.index}: ${marker}`);
        }
      }
    }
  }
  if (findings.length > 0) {
    throw new Error(`Forbidden shell markers remain:\n${findings.join('\n')}`);
  }
}

async function sha256(file) {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
}

async function checkReleaseAssets() {
  const releaseDirectory = path.join(repositoryRoot, 'dist-release');
  const required = [
    `${slug}-${version}-cli-any.tgz`,
    `${slug}-${version}-sample-report-any.json`,
    `${slug}-${version}-sample-report-any.md`,
    `${slug}-${version}-web-any.zip`,
  ];
  const checksumPath = path.join(releaseDirectory, 'SHA256SUMS.txt');
  const checksumText = await readFile(checksumPath, 'utf8');
  const checksums = new Map(
    checksumText
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
        if (!match) {
          throw new Error(`Malformed checksum line: ${line}`);
        }
        return [match[2], match[1]];
      }),
  );
  for (const name of required) {
    const expected = checksums.get(name);
    if (!expected || (await sha256(path.join(releaseDirectory, name))) !== expected) {
      throw new Error(`Missing or invalid release checksum for ${name}.`);
    }
  }
  if (checksums.size !== required.length) {
    throw new Error('SHA256SUMS.txt contains an unexpected release asset set.');
  }

  const sample = JSON.parse(
    await readFile(
      path.join(releaseDirectory, `${slug}-${version}-sample-report-any.json`),
      'utf8',
    ),
  );
  if (sample.summary?.impacts !== 11 || sample.summary?.migrationTasks !== 11) {
    throw new Error('Release sample report does not match the verified fixture.');
  }
}

try {
  await checkCleanHistory();
  await checkVersionsAndChangelog();
  await scanRepositoryForSecrets();
  await checkForbiddenMarkers();
  await checkReleaseAssets();
  await verifyAll();
  process.stdout.write(
    `Release check passed for ${slug}@${version}${developmentMode ? ' (development mode)' : ''}.\n`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
}
