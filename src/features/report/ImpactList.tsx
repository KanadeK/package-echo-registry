import { WarningCircle } from '@phosphor-icons/react';

import type { Impact } from '../../core/model.js';

export interface ImpactListProps {
  impacts: Impact[];
  selectedImpactId?: string;
  onSelectImpact: (impactId: string) => void;
}

export function ImpactList({ impacts, selectedImpactId, onSelectImpact }: ImpactListProps) {
  if (impacts.length === 0) {
    return (
      <div className="empty-state" role="status">
        <WarningCircle aria-hidden="true" size={24} weight="regular" />
        <p>No impacts match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="impact-list" aria-label="Impact results">
      {impacts.map((impact) => (
        <button
          className={impact.id === selectedImpactId ? 'impact-row is-selected' : 'impact-row'}
          key={impact.id}
          onClick={() => onSelectImpact(impact.id)}
          type="button"
          aria-pressed={impact.id === selectedImpactId}
        >
          <span className={`severity severity-${impact.severity}`}>{impact.severity}</span>
          <span className="impact-row-copy">
            <strong>{impact.targetPackage}</strong>
            <span>
              {impact.memberName ?? impact.changedPackage} · {impact.riskType}
            </span>
          </span>
          <span className="path-length">{impact.evidencePath.length} nodes</span>
        </button>
      ))}
    </div>
  );
}
