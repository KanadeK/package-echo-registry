import type { DownstreamGraph, GraphEdge, GraphNode } from '../../core/model.js';

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

export interface PositionedEdge {
  edge: GraphEdge;
  path: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

const kindOrder: GraphNode['kind'][] = ['package', 'consumer', 'example'];

export function layoutGraph(graph: DownstreamGraph): GraphLayout {
  const nodeWidth = 230;
  const nodeHeight = 58;
  const columnGap = 90;
  const rowGap = 26;
  const padding = 28;
  const columns = new Map(
    kindOrder.map((kind) => [
      kind,
      graph.nodes
        .filter((node) => node.kind === kind)
        .sort((left, right) => left.name.localeCompare(right.name)),
    ]),
  );
  const maxRows = Math.max(1, ...kindOrder.map((kind) => columns.get(kind)?.length ?? 0));
  const height = Math.max(340, padding * 2 + maxRows * nodeHeight + (maxRows - 1) * rowGap);
  const width = padding * 2 + kindOrder.length * nodeWidth + 2 * columnGap;
  const nodes: PositionedNode[] = [];

  kindOrder.forEach((kind, columnIndex) => {
    const column = columns.get(kind) ?? [];
    const contentHeight = column.length * nodeHeight + Math.max(0, column.length - 1) * rowGap;
    const startY = Math.max(padding, (height - contentHeight) / 2);
    column.forEach((node, rowIndex) => {
      nodes.push({
        ...node,
        x: padding + columnIndex * (nodeWidth + columnGap),
        y: startY + rowIndex * (nodeHeight + rowGap),
      });
    });
  });

  const positionById = new Map(nodes.map((node) => [node.id, node]));
  const edges = graph.edges.flatMap<PositionedEdge>((edge) => {
    const source = positionById.get(edge.from);
    const target = positionById.get(edge.to);
    if (!source || !target) {
      return [];
    }
    const sourceX = source.x + nodeWidth;
    const sourceY = source.y + nodeHeight / 2;
    const targetX = target.x;
    const targetY = target.y + nodeHeight / 2;
    const bend = Math.max(40, Math.abs(targetX - sourceX) / 2);
    return [
      {
        edge,
        path: `M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX - bend} ${targetY}, ${targetX} ${targetY}`,
      },
    ];
  });

  return {
    width,
    height,
    nodeWidth,
    nodeHeight,
    nodes,
    edges,
  };
}
