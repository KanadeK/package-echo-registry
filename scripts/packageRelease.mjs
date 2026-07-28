import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

import AdmZip from 'adm-zip';
import { build as viteBuild } from 'vite';

import { buildCli } from './buildCli.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const rootPackage = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const slug = rootPackage.name;
const version = rootPackage.version;
const releaseDirectory = path.join(repositoryRoot, 'dist-release');
const cliArchiveName = `${slug}-${version}-cli-any.tgz`;
const webArchiveName = `${slug}-${version}-web-any.zip`;
const sampleJsonName = `${slug}-${version}-sample-report-any.json`;
const sampleMarkdownName = `${slug}-${version}-sample-report-any.md`;

function assertReleasePath(target) {
  if (path.dirname(target) !== repositoryRoot || path.basename(target) !== 'dist-release') {
    throw new Error(`Refusing to clean unexpected release path: ${target}`);
  }
}

function run(command, arguments_, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: options.cwd ?? repositoryRoot,
      env: {
        ...process.env,
        ...options.env,
      },
      shell: options.shell ?? false,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (status) => {
      if (status === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with status ${status ?? 'unknown'}.`));
      }
    });
  });
}

function runNode(arguments_, cwd = repositoryRoot) {
  return run(process.execPath, arguments_, { cwd });
}

function runNpm(arguments_, cwd) {
  const npmCli = process.env.npm_execpath;
  const env = {
    npm_config_cache: path.join(path.dirname(cwd), 'npm-cache'),
  };
  if (npmCli) {
    return run(process.execPath, [npmCli, ...arguments_], { cwd, env });
  }
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return run(command, arguments_, {
    cwd,
    env,
    shell: process.platform === 'win32',
  });
}

async function sha256(file) {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
}

async function buildApplication() {
  const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
  await runNode([tsxCli, 'scripts/generate-demo-report.ts']);
  await viteBuild({ root: repositoryRoot });
  await buildCli();
}

async function stageNpmPackage(stagingRoot) {
  const packageRoot = path.join(stagingRoot, 'npm-package');
  await mkdir(packageRoot, { recursive: true });
  const packageJson = {
    name: slug,
    version,
    description: rootPackage.description,
    type: 'module',
    license: rootPackage.license,
    author: rootPackage.author,
    homepage: rootPackage.homepage,
    repository: rootPackage.repository,
    bugs: rootPackage.bugs,
    keywords: rootPackage.keywords,
    engines: rootPackage.engines,
    bin: {
      'package-echo': './dist-cli/cli.js',
    },
  };
  await Promise.all([
    writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify(packageJson, null, 2)}\n`,
      'utf8',
    ),
    cp(path.join(repositoryRoot, 'dist-cli'), path.join(packageRoot, 'dist-cli'), {
      recursive: true,
    }),
    cp(
      path.join(repositoryRoot, 'examples', 'fixture-monorepo'),
      path.join(packageRoot, 'examples', 'fixture-monorepo'),
      { recursive: true },
    ),
    copyFile(path.join(repositoryRoot, 'README.md'), path.join(packageRoot, 'README.md')),
    copyFile(
      path.join(repositoryRoot, 'README.zh-CN.md'),
      path.join(packageRoot, 'README.zh-CN.md'),
    ),
    copyFile(path.join(repositoryRoot, 'LICENSE'), path.join(packageRoot, 'LICENSE')),
    copyFile(
      path.join(repositoryRoot, 'THIRD_PARTY_NOTICES.md'),
      path.join(packageRoot, 'THIRD_PARTY_NOTICES.md'),
    ),
  ]);
  await chmod(path.join(packageRoot, 'dist-cli', 'cli.js'), 0o755);
  await runNpm(['pack', '--pack-destination', releaseDirectory], packageRoot);
  const generatedArchive = path.join(releaseDirectory, `${slug}-${version}.tgz`);
  const targetArchive = path.join(releaseDirectory, cliArchiveName);
  await rename(generatedArchive, targetArchive);
  return targetArchive;
}

async function createWebArchive() {
  const target = path.join(releaseDirectory, webArchiveName);
  const zip = new AdmZip();
  zip.addLocalFolder(path.join(repositoryRoot, 'dist'));
  zip.addLocalFile(path.join(repositoryRoot, 'LICENSE'), '', 'LICENSE.txt');
  zip.addLocalFile(
    path.join(repositoryRoot, 'THIRD_PARTY_NOTICES.md'),
    '',
    'THIRD_PARTY_NOTICES.txt',
  );
  zip.writeZip(target);
  return target;
}

async function copySampleReports() {
  const jsonTarget = path.join(releaseDirectory, sampleJsonName);
  const markdownTarget = path.join(releaseDirectory, sampleMarkdownName);
  await Promise.all([
    copyFile(path.join(repositoryRoot, 'public', 'demo-report.json'), jsonTarget),
    copyFile(path.join(repositoryRoot, 'dist-demo', 'package-echo-report.md'), markdownTarget),
  ]);
  return [jsonTarget, markdownTarget];
}

async function writeChecksums(assets) {
  const entries = [];
  for (const asset of [...assets].sort((left, right) =>
    path.basename(left).localeCompare(path.basename(right)),
  )) {
    entries.push(`${await sha256(asset)}  ${path.basename(asset)}`);
  }
  const checksumFile = path.join(releaseDirectory, 'SHA256SUMS.txt');
  await writeFile(checksumFile, `${entries.join('\n')}\n`, 'utf8');
  return checksumFile;
}

async function validateInstalledCli(cliArchive, validationRoot) {
  const installRoot = path.join(validationRoot, 'install');
  await mkdir(installRoot, { recursive: true });
  await writeFile(
    path.join(installRoot, 'package.json'),
    `${JSON.stringify({ name: 'package-echo-smoke', private: true }, null, 2)}\n`,
    'utf8',
  );
  await runNpm(['install', cliArchive, '--ignore-scripts', '--no-audit', '--no-fund'], installRoot);
  const installedCli = path.join(installRoot, 'node_modules', slug, 'dist-cli', 'cli.js');
  const smokeOutput = path.join(validationRoot, 'cli-output');
  await runNode([installedCli, 'demo', '--output', smokeOutput], installRoot);
  const reportPath = path.join(smokeOutput, 'package-echo-report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  if (report.summary?.impacts !== 11 || report.summary?.migrationTasks !== 11) {
    throw new Error('Installed CLI smoke report did not contain the expected fixture result.');
  }
  await runNode([installedCli, 'validate', reportPath], installRoot);
}

async function validateWebArchive(webArchive, validationRoot) {
  const extractionRoot = path.join(validationRoot, 'web');
  await mkdir(extractionRoot, { recursive: true });
  const zip = new AdmZip(webArchive);
  const entries = zip.getEntries().map((entry) => entry.entryName);
  if (
    entries.some(
      (entry) =>
        entry.startsWith('/') ||
        entry.includes('../') ||
        /(^|\/)\.env(?:\.|$)/.test(entry) ||
        entry.includes('node_modules/'),
    )
  ) {
    throw new Error('Web archive contains an unsafe or private entry.');
  }
  zip.extractAllTo(extractionRoot, true);
  const [index, report] = await Promise.all([
    readFile(path.join(extractionRoot, 'index.html'), 'utf8'),
    readFile(path.join(extractionRoot, 'demo-report.json'), 'utf8'),
  ]);
  if (!index.includes('id="root"') || JSON.parse(report).summary?.impacts !== 11) {
    throw new Error('Extracted Web archive failed its fixture smoke validation.');
  }
}

async function validateChecksums(checksumFile) {
  const lines = (await readFile(checksumFile, 'utf8')).trim().split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
    if (!match) {
      throw new Error(`Malformed checksum line: ${line}`);
    }
    const [, expected, name] = match;
    if ((await sha256(path.join(releaseDirectory, name))) !== expected) {
      throw new Error(`Checksum verification failed for ${name}.`);
    }
  }
}

export async function packageRelease() {
  assertReleasePath(releaseDirectory);
  await rm(releaseDirectory, { force: true, recursive: true });
  await mkdir(releaseDirectory, { recursive: true });
  const stagingRoot = await mkdtemp(path.join(tmpdir(), `${slug}-package-`));
  const validationRoot = await mkdtemp(path.join(tmpdir(), `${slug}-validation-`));
  try {
    await buildApplication();
    const cliArchive = await stageNpmPackage(stagingRoot);
    const webArchive = await createWebArchive();
    const samples = await copySampleReports();
    const assets = [cliArchive, webArchive, ...samples];
    const checksumFile = await writeChecksums(assets);
    await validateInstalledCli(cliArchive, validationRoot);
    await validateWebArchive(webArchive, validationRoot);
    await validateChecksums(checksumFile);

    const names = (await readdir(releaseDirectory)).sort((left, right) =>
      left.localeCompare(right),
    );
    process.stdout.write(`Packaged and validated ${names.length} release files:\n`);
    for (const name of names) {
      process.stdout.write(`- ${name}\n`);
    }
  } finally {
    await Promise.all([
      rm(stagingRoot, { force: true, recursive: true }),
      rm(validationRoot, { force: true, recursive: true }),
    ]);
  }
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await packageRelease();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  }
}
