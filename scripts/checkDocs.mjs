import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const topLevel = ['README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md'];
const linkPattern = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export async function checkDocumentation() {
  const docsDirectory = path.join(repositoryRoot, 'docs');
  const docs = (await readdir(docsDirectory))
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join('docs', name));
  const markdownFiles = [...topLevel, ...docs];
  const failures = [];

  for (const relativeFile of markdownFiles) {
    const absoluteFile = path.join(repositoryRoot, relativeFile);
    const content = await readFile(absoluteFile, 'utf8');
    for (const match of content.matchAll(linkPattern)) {
      const target = match[1];
      if (
        !target ||
        target.startsWith('#') ||
        target.startsWith('https://') ||
        target.startsWith('http://') ||
        target.startsWith('mailto:')
      ) {
        continue;
      }
      const fileTarget = decodeURIComponent(target.split('#', 1)[0] ?? '');
      const absoluteTarget = path.resolve(path.dirname(absoluteFile), fileTarget);
      const relativeTarget = path.relative(repositoryRoot, absoluteTarget);
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        failures.push(`${relativeFile}: link leaves the repository: ${target}`);
        continue;
      }
      try {
        await stat(absoluteTarget);
      } catch {
        failures.push(`${relativeFile}: missing link target: ${target}`);
      }
    }
  }

  const screenshot = await readFile(path.join(docsDirectory, 'assets', 'dashboard.png'));
  const pngSignature = '89504e470d0a1a0a';
  if (screenshot.subarray(0, 8).toString('hex') !== pngSignature) {
    failures.push('docs/assets/dashboard.png is not a PNG.');
  } else {
    const width = screenshot.readUInt32BE(16);
    const height = screenshot.readUInt32BE(20);
    if (width < 1200 || height < 800) {
      failures.push(`dashboard screenshot is too small: ${width}x${height}.`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }

  process.stdout.write(`Validated ${markdownFiles.length} Markdown files and the dashboard PNG.\n`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await checkDocumentation();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
