import { satisfies, valid } from 'semver';

import { diffApiSnapshots } from './apiDiff.js';
import {
  buildDownstreamGraph,
  evidenceForPath,
  findEvidencePath,
  listDownstreamTargets,
} from './dependencyGraph.js';
import { createMigrationTasks } from './migrationPlan.js';
import type {
  AnalysisInput,
  AnalysisOptions,
  AnalysisReport,
  ChangeRecord,
  Evidence,
  Impact,
  PackageManifest,
  SourceUsage,
} from './model.js';
import { PROJECT_METADATA } from './projectMetadata.js';

function attachChangesetEvidence(change: ChangeRecord, input: AnalysisInput): ChangeRecord {
  const evidence = input.changesets
    .filter((changeset) =>
      changeset.releases.some((release) => release.name === change.packageName),
    )
    .map<Evidence>((changeset) => ({
      kind: 'changeset',
      path: changeset.relativePath,
      detail: changeset.summary,
    }));

  return {
    ...change,
    evidence: [...change.evidence, ...evidence],
  };
}

function releaseIntentChanges(input: AnalysisInput): ChangeRecord[] {
  const currentVersionByName = new Map(
    input.currentApiSnapshots.map((snapshot) => [snapshot.packageName, snapshot.packageVersion]),
  );
  const previousVersionByName = new Map(
    input.previousApiSnapshots.map((snapshot) => [snapshot.packageName, snapshot.packageVersion]),
  );

  return input.changesets.flatMap((changeset) =>
    changeset.releases.map((release) => ({
      id: `release-intent:${release.name}:${changeset.id}`,
      packageName: release.name,
      changeType: 'release-intent' as const,
      severity: 'info' as const,
      currentVersion: currentVersionByName.get(release.name) ?? 'unknown',
      evidence: [
        {
          kind: 'changeset' as const,
          path: changeset.relativePath,
          detail: changeset.summary,
        },
      ],
      ...(previousVersionByName.has(release.name)
        ? {
            previousVersion: previousVersionByName.get(release.name),
          }
        : {}),
      releaseType: release.type,
    })),
  );
}

function sourceEvidence(usage: SourceUsage): Evidence {
  return {
    kind: 'source',
    path: usage.consumerFile,
    line: usage.line,
    detail: `${usage.consumerName} imports ${usage.importedMembers.join(', ')} from ${usage.importedPackage}.`,
  };
}

function edgeEvidence(graph: AnalysisReport['graph'], path: string[]): Evidence[] {
  return evidenceForPath(graph, path).map((edge) => ({
    kind: 'manifest',
    path: edge.evidencePath,
    detail: `${edge.to} declares ${edge.from} as a ${edge.relationship} with range ${edge.range}.`,
  }));
}

function usageForTarget(
  sourceUsages: SourceUsage[],
  path: string[],
  target: string,
): SourceUsage | undefined {
  const targetIndex = path.indexOf(target);
  const upstream = targetIndex > 0 ? path[targetIndex - 1] : undefined;
  return sourceUsages
    .filter(
      (usage) => usage.consumerName === target && (!upstream || usage.importedPackage === upstream),
    )
    .sort(
      (left, right) =>
        left.consumerFile.localeCompare(right.consumerFile) || left.line - right.line,
    )[0];
}

function impactsForApiChange(
  change: ChangeRecord,
  input: AnalysisInput,
  reportGraph: AnalysisReport['graph'],
  manifestByName: Map<string, PackageManifest>,
): Impact[] {
  if (change.changeType !== 'api-removed' && change.changeType !== 'api-signature-changed') {
    return [];
  }

  const directUsages = input.sourceUsages.filter(
    (usage) =>
      usage.importedPackage === change.packageName &&
      change.memberName !== undefined &&
      usage.importedMembers.includes(change.memberName),
  );
  const candidateTargets = new Set<string>(directUsages.map((usage) => usage.consumerName));

  for (const target of listDownstreamTargets(reportGraph, change.packageName)) {
    candidateTargets.add(target);
  }

  const impacts: Impact[] = [];
  for (const target of [...candidateTargets].sort((left, right) => left.localeCompare(right))) {
    const targetManifest = manifestByName.get(target);
    const path = findEvidencePath(reportGraph, change.packageName, target);
    if (!targetManifest || !path || path.length < 2) {
      continue;
    }
    const directUsage = directUsages
      .filter((usage) => usage.consumerName === target)
      .sort(
        (left, right) =>
          left.consumerFile.localeCompare(right.consumerFile) || left.line - right.line,
      )[0];
    const targetUsage = directUsage ?? usageForTarget(input.sourceUsages, path, target);
    const evidence = [
      ...change.evidence,
      ...edgeEvidence(reportGraph, path),
      ...(targetUsage ? [sourceEvidence(targetUsage)] : []),
    ];
    impacts.push({
      id: `impact:${change.id}:${target}`,
      changeId: change.id,
      changeType: change.changeType,
      changedPackage: change.packageName,
      targetPackage: target,
      targetKind: targetManifest.kind,
      severity: 'high',
      riskType: targetManifest.kind === 'example' ? 'example-breakage' : 'breaking-api',
      evidencePath: path,
      evidence,
      ...(change.memberName
        ? {
            memberName: change.memberName,
          }
        : {}),
      ...(targetUsage
        ? {
            sourceLocation: {
              path: targetUsage.consumerFile,
              line: targetUsage.line,
            },
          }
        : {}),
    });
  }

  return impacts;
}

function peerRangeFindings(
  input: AnalysisInput,
  graph: AnalysisReport['graph'],
  manifestByName: Map<string, PackageManifest>,
): {
  changes: ChangeRecord[];
  impacts: Impact[];
} {
  const changes: ChangeRecord[] = [];
  const impacts: Impact[] = [];

  for (const edge of graph.edges.filter(
    (candidate) => candidate.relationship === 'peerDependency',
  )) {
    const dependency = manifestByName.get(edge.from);
    const consumer = manifestByName.get(edge.to);
    if (
      !dependency ||
      !consumer ||
      !valid(dependency.version) ||
      satisfies(dependency.version, edge.range, {
        includePrerelease: true,
      })
    ) {
      continue;
    }

    const id = `peer-range-incompatible:${edge.from}:${edge.to}`;
    const evidence: Evidence[] = [
      {
        kind: 'manifest',
        path: edge.evidencePath,
        detail: `${consumer.name} requires ${edge.from}@${edge.range}, but the workspace provides ${dependency.version}.`,
      },
    ];
    const previousVersion = input.previousApiSnapshots.find(
      (snapshot) => snapshot.packageName === dependency.name,
    )?.packageVersion;
    changes.push({
      id,
      packageName: dependency.name,
      changeType: 'peer-range-incompatible',
      severity: 'high',
      currentVersion: dependency.version,
      evidence,
      ...(previousVersion
        ? {
            previousVersion,
          }
        : {}),
    });
    impacts.push({
      id: `impact:${id}:${consumer.name}`,
      changeId: id,
      changeType: 'peer-range-incompatible',
      changedPackage: dependency.name,
      targetPackage: consumer.name,
      targetKind: consumer.kind,
      severity: 'high',
      riskType: 'peer-dependency',
      evidencePath: [dependency.name, consumer.name],
      evidence,
      sourceLocation: {
        path: edge.evidencePath,
      },
    });
  }

  return {
    changes,
    impacts,
  };
}

export function analyzeImpact(input: AnalysisInput, options: AnalysisOptions): AnalysisReport {
  const graph = buildDownstreamGraph(input.manifests);
  const manifestByName = new Map(input.manifests.map((manifest) => [manifest.name, manifest]));
  const currentByName = new Map(
    input.currentApiSnapshots.map((snapshot) => [snapshot.packageName, snapshot]),
  );
  const apiChanges = input.previousApiSnapshots.flatMap((previous) => {
    const current = currentByName.get(previous.packageName);
    return current
      ? diffApiSnapshots(previous, current).map((change) => attachChangesetEvidence(change, input))
      : [];
  });
  const releaseChanges = releaseIntentChanges(input);
  const apiImpacts = apiChanges.flatMap((change) =>
    impactsForApiChange(change, input, graph, manifestByName),
  );
  const peerFindings = peerRangeFindings(input, graph, manifestByName);
  const changes = [...apiChanges, ...releaseChanges, ...peerFindings.changes].sort(
    (left, right) =>
      left.packageName.localeCompare(right.packageName) || left.id.localeCompare(right.id),
  );
  const impacts = [...apiImpacts, ...peerFindings.impacts]
    .filter(
      (impact, index, values) =>
        values.findIndex((candidate) => candidate.id === impact.id) === index,
    )
    .sort(
      (left, right) =>
        left.changedPackage.localeCompare(right.changedPackage) ||
        left.targetPackage.localeCompare(right.targetPackage) ||
        left.id.localeCompare(right.id),
    );
  const migrationTasks = createMigrationTasks(impacts);

  return {
    formatVersion: PROJECT_METADATA.reportFormatVersion,
    toolVersion: PROJECT_METADATA.version,
    generatedAt: options.now().toISOString(),
    rootLabel: input.rootLabel,
    summary: {
      packages: input.manifests.filter((manifest) => manifest.kind === 'package').length,
      consumers: input.manifests.filter((manifest) => manifest.kind === 'consumer').length,
      examples: input.manifests.filter((manifest) => manifest.kind === 'example').length,
      changes: changes.length,
      breakingChanges: changes.filter(
        (change) =>
          change.changeType === 'api-removed' || change.changeType === 'api-signature-changed',
      ).length,
      impacts: impacts.length,
      migrationTasks: migrationTasks.length,
    },
    graph,
    changes,
    impacts,
    migrationTasks,
  };
}
