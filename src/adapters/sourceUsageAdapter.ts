import path from 'node:path';

import fg from 'fast-glob';
import { Project } from 'ts-morph';

import type { PackageManifest, SourceUsage } from '../core/model.js';
import { resolveWithinRoot, toPosixPath } from './pathSafety.js';

interface ManifestDirectory {
  manifest: PackageManifest;
  relativeRoot: string;
}

export async function readSourceUsages(
  root: string,
  manifests: PackageManifest[],
): Promise<SourceUsage[]> {
  const internalNames = new Set(manifests.map((manifest) => manifest.name));
  const manifestDirectories: ManifestDirectory[] = manifests
    .map((manifest) => ({
      manifest,
      relativeRoot: toPosixPath(path.dirname(manifest.relativePath)),
    }))
    .sort((left, right) => right.relativeRoot.length - left.relativeRoot.length);
  const sourcePatterns = manifestDirectories.map(
    (entry) => `${entry.relativeRoot}/**/*.{ts,tsx,mts,cts}`,
  );
  const sourceFiles = await fg(sourcePatterns, {
    cwd: root,
    ignore: ['**/*.d.ts', '**/node_modules/**'],
    onlyFiles: true,
    unique: true,
  });
  const project = new Project({
    compilerOptions: {
      allowJs: false,
      skipLibCheck: true,
    },
    skipAddingFilesFromTsConfig: true,
  });
  const sourceMetadata = new Map<
    string,
    {
      owner: PackageManifest;
      relativePath: string;
    }
  >();

  for (const relativeSourceFile of sourceFiles.sort((left, right) => left.localeCompare(right))) {
    const normalizedSourcePath = toPosixPath(relativeSourceFile);
    const owner = manifestDirectories.find(
      (candidate) =>
        normalizedSourcePath === candidate.relativeRoot ||
        normalizedSourcePath.startsWith(`${candidate.relativeRoot}/`),
    )?.manifest;
    if (!owner) {
      continue;
    }
    const sourceFile = project.addSourceFileAtPath(resolveWithinRoot(root, relativeSourceFile));
    sourceMetadata.set(sourceFile.getFilePath(), {
      owner,
      relativePath: normalizedSourcePath,
    });
  }

  const usages: SourceUsage[] = [];
  for (const sourceFile of project
    .getSourceFiles()
    .sort((left, right) => left.getFilePath().localeCompare(right.getFilePath()))) {
    const metadata = sourceMetadata.get(sourceFile.getFilePath());
    if (!metadata) {
      continue;
    }
    for (const declaration of sourceFile.getImportDeclarations()) {
      const importedPackage = declaration.getModuleSpecifierValue();
      if (!internalNames.has(importedPackage)) {
        continue;
      }
      const importedMembers = declaration
        .getNamedImports()
        .map((namedImport) => namedImport.getName());
      if (declaration.getDefaultImport()) {
        importedMembers.push('default');
      }
      if (declaration.getNamespaceImport()) {
        importedMembers.push('*');
      }
      const position = sourceFile.getLineAndColumnAtPos(declaration.getStart());
      usages.push({
        consumerName: metadata.owner.name,
        consumerFile: metadata.relativePath,
        importedPackage,
        importedMembers: importedMembers.sort((left, right) => left.localeCompare(right)),
        line: position.line,
      });
    }
  }

  return usages.sort(
    (left, right) =>
      left.consumerName.localeCompare(right.consumerName) ||
      left.consumerFile.localeCompare(right.consumerFile) ||
      left.line - right.line,
  );
}
