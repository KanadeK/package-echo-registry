import { DirectedGraph } from 'graphology';

import type {
  DependencyRelationship,
  DownstreamGraph,
  GraphEdge,
  PackageManifest,
} from './model.js';

const dependencySections: Array<{
  field: 'dependencies' | 'devDependencies' | 'peerDependencies';
  relationship: DependencyRelationship;
}> = [
  {
    field: 'dependencies',
    relationship: 'dependency',
  },
  {
    field: 'peerDependencies',
    relationship: 'peerDependency',
  },
  {
    field: 'devDependencies',
    relationship: 'devDependency',
  },
];

function toRuntimeGraph(graph: DownstreamGraph): DirectedGraph {
  const runtime = new DirectedGraph();
  for (const node of graph.nodes) {
    runtime.addNode(node.id);
  }
  for (const edge of graph.edges) {
    if (!runtime.hasEdge(edge.from, edge.to)) {
      runtime.addDirectedEdgeWithKey(edge.id, edge.from, edge.to);
    }
  }
  return runtime;
}

export function buildDownstreamGraph(manifests: PackageManifest[]): DownstreamGraph {
  const workspaceNames = new Set(manifests.map((manifest) => manifest.name));
  const nodes = manifests
    .map((manifest) => ({
      id: manifest.name,
      kind: manifest.kind,
      manifestPath: manifest.relativePath,
      name: manifest.name,
      version: manifest.version,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const edgesByPair = new Map<string, GraphEdge>();

  for (const manifest of [...manifests].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    for (const section of dependencySections) {
      const entries = Object.entries(manifest[section.field]).sort(([left], [right]) =>
        left.localeCompare(right),
      );
      for (const [dependencyName, range] of entries) {
        if (!workspaceNames.has(dependencyName)) {
          continue;
        }
        const pair = `${dependencyName}\u0000${manifest.name}`;
        if (edgesByPair.has(pair)) {
          continue;
        }
        edgesByPair.set(pair, {
          id: `${dependencyName}->${manifest.name}:${section.relationship}`,
          from: dependencyName,
          to: manifest.name,
          relationship: section.relationship,
          range,
          evidencePath: manifest.relativePath,
        });
      }
    }
  }

  return {
    nodes,
    edges: [...edgesByPair.values()].sort(
      (left, right) =>
        left.from.localeCompare(right.from) ||
        left.to.localeCompare(right.to) ||
        left.relationship.localeCompare(right.relationship),
    ),
  };
}

export function findEvidencePath(
  graph: DownstreamGraph,
  source: string,
  target: string,
): string[] | undefined {
  if (source === target) {
    return [source];
  }

  const runtime = toRuntimeGraph(graph);
  if (!runtime.hasNode(source) || !runtime.hasNode(target)) {
    return undefined;
  }

  const queue: string[] = [source];
  const previous = new Map<string, string>();
  const visited = new Set<string>([source]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    const neighbors = runtime
      .outNeighbors(current)
      .sort((left, right) => left.localeCompare(right));
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      previous.set(neighbor, current);
      if (neighbor === target) {
        const path = [target];
        let cursor = target;
        while (previous.has(cursor)) {
          const parent = previous.get(cursor);
          if (!parent) {
            break;
          }
          path.unshift(parent);
          cursor = parent;
        }
        return path;
      }
      queue.push(neighbor);
    }
  }

  return undefined;
}

export function listDownstreamTargets(graph: DownstreamGraph, source: string): string[] {
  return graph.nodes
    .map((node) => node.id)
    .filter((target) => target !== source && findEvidencePath(graph, source, target))
    .sort((left, right) => left.localeCompare(right));
}

export function evidenceForPath(graph: DownstreamGraph, path: string[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    const edge = graph.edges.find((candidate) => candidate.from === from && candidate.to === to);
    if (edge) {
      edges.push(edge);
    }
  }
  return edges;
}
