import process from 'node:process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

import { ESLint } from 'eslint';
import fg from 'fast-glob';
import { check, getFileInfo, resolveConfig } from 'prettier';
import ts from 'typescript';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const formatPattern = '**/*.{css,html,js,json,md,mjs,ts,tsx,yaml,yml}';

export async function checkFormatting() {
  const files = await fg(formatPattern, {
    absolute: true,
    cwd: repositoryRoot,
    dot: true,
    followSymbolicLinks: false,
    ignore: ['.git/**', 'node_modules/**'],
    onlyFiles: true,
    unique: true,
  });
  const failures = [];
  let checkedFiles = 0;
  for (const file of files.sort((left, right) => left.localeCompare(right))) {
    const info = await getFileInfo(file, {
      ignorePath: path.join(repositoryRoot, '.prettierignore'),
    });
    if (info.ignored) {
      continue;
    }
    const content = ts.sys.readFile(file);
    if (content === undefined) {
      failures.push(`${path.relative(repositoryRoot, file)} (unreadable)`);
      continue;
    }
    checkedFiles += 1;
    const config = await resolveConfig(file);
    if (!(await check(content, { ...config, filepath: file }))) {
      failures.push(path.relative(repositoryRoot, file).split(path.sep).join('/'));
    }
  }
  if (failures.length > 0) {
    throw new Error(`Prettier check failed:\n${failures.join('\n')}`);
  }
  process.stdout.write(`Checked ${checkedFiles} formatted source files.\n`);
}

export async function checkLint() {
  const eslint = new ESLint({ cwd: repositoryRoot });
  const results = await eslint.lintFiles(['.']);
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) {
    process.stdout.write(output);
  }
  const errors = results.reduce((total, result) => total + result.errorCount, 0);
  if (errors > 0) {
    throw new Error(`ESLint reported ${errors} error${errors === 1 ? '' : 's'}.`);
  }
}

export function checkTypeScript() {
  const configPath = ts.findConfigFile(repositoryRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('tsconfig.json was not found.');
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    repositoryRoot,
    { noEmit: true },
    configPath,
  );
  const program = ts.createProgram({
    options: parsed.options,
    rootNames: parsed.fileNames,
  });
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length > 0) {
    const host = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => repositoryRoot,
      getNewLine: () => ts.sys.newLine,
    };
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  }
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await checkFormatting();
    await checkLint();
    checkTypeScript();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
