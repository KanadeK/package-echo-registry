import { chmod, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

import { build } from 'esbuild';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = path.join(repositoryRoot, 'dist-cli');
const output = path.join(outputDirectory, 'cli.js');

export async function buildCli() {
  if (
    path.dirname(outputDirectory) !== path.resolve(repositoryRoot) ||
    path.basename(outputDirectory) !== 'dist-cli'
  ) {
    throw new Error(`Refusing to clean unexpected CLI path: ${outputDirectory}`);
  }
  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  await build({
    banner: {
      js: [
        "import { createRequire } from 'node:module';",
        "import { dirname as __pathDirname } from 'node:path';",
        "import { fileURLToPath as __fileURLToPath } from 'node:url';",
        'const require = createRequire(import.meta.url);',
        'const __filename = __fileURLToPath(import.meta.url);',
        'const __dirname = __pathDirname(__filename);',
      ].join('\n'),
    },
    bundle: true,
    entryPoints: [path.join(repositoryRoot, 'src', 'cli', 'index.ts')],
    format: 'esm',
    legalComments: 'external',
    outfile: output,
    platform: 'node',
    sourcemap: false,
    target: 'node22',
  });
  await chmod(output, 0o755);
  process.stdout.write(`Built ${output}\n`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await buildCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  }
}
