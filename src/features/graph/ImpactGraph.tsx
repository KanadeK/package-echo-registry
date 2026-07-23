import type { KeyboardEvent } from 'react';

import type { DownstreamGraph } from '../../core/model.js';
import { layoutGraph } from './layoutGraph.js';

export interface ImpactGraphProps {
  graph: DownstreamGraph;
  selectedNode?: string;
  onSelectNode: (nodeId: string) => void;
}

function shortName(name: string): string {
  return name.includes('/') ? (name.split('/').at(-1) ?? name) : name;
}

export function ImpactGraph({ graph, selectedNode, onSelectNode }: ImpactGraphProps) {
  const layout = layoutGraph(graph);
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, nodeId: string): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectNode(nodeId);
    }
  };

  return (
    <div className="graph-scroll" data-testid="impact-graph">
      <svg
        className="impact-graph"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="group"
        aria-label="Package to consumer to example dependency graph"
      >
        {layout.edges.map(({ edge, path }) => (
          <path className="graph-edge" d={path} key={edge.id} data-relationship={edge.relationship}>
            <title>
              {edge.from} to {edge.to}, {edge.relationship}
            </title>
          </path>
        ))}
        {layout.nodes.map((node) => {
          const selected = node.id === selectedNode;
          return (
            <g
              className={selected ? 'graph-node is-selected' : 'graph-node'}
              data-kind={node.kind}
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              onKeyDown={(event) => handleKeyDown(event, node.id)}
              role="button"
              tabIndex={0}
              transform={`translate(${node.x} ${node.y})`}
              aria-label={`Focus impacts involving ${node.name}`}
              aria-pressed={selected}
            >
              <rect width={layout.nodeWidth} height={layout.nodeHeight} rx="8" />
              <text className="graph-node-name" x="14" y="25">
                {shortName(node.name)}
              </text>
              <text className="graph-node-meta" x="14" y="44">
                {node.kind} {node.version}
              </text>
              <title>
                {node.name} {node.version}, {node.kind}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
