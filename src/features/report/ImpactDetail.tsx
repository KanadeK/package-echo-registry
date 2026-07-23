import { CaretRight, Code, FileText, GitBranch } from '@phosphor-icons/react';

import type { Impact } from '../../core/model.js';

function EvidenceIcon({ kind }: { kind: Impact['evidence'][number]['kind'] }) {
  if (kind === 'source') {
    return <Code aria-hidden="true" size={18} />;
  }
  if (kind === 'manifest' || kind === 'changeset') {
    return <FileText aria-hidden="true" size={18} />;
  }
  return <GitBranch aria-hidden="true" size={18} />;
}

export function ImpactDetail({ impact }: { impact?: Impact }) {
  if (!impact) {
    return (
      <div className="empty-state detail-empty">
        <GitBranch aria-hidden="true" size={28} />
        <p>Select an impact to inspect its evidence path.</p>
      </div>
    );
  }

  return (
    <article className="impact-detail" aria-live="polite">
      <header>
        <span className={`severity severity-${impact.severity}`}>{impact.severity}</span>
        <h3>{impact.targetPackage}</h3>
        <p>
          {impact.changeType} from <strong>{impact.changedPackage}</strong>
        </p>
      </header>

      <section>
        <h4>Evidence path</h4>
        <ol className="evidence-path" aria-label="Directed evidence path">
          {impact.evidencePath.map((node, index) => (
            <li key={node}>
              <span>{node}</span>
              {index < impact.evidencePath.length - 1 ? (
                <CaretRight aria-hidden="true" size={15} />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h4>Evidence</h4>
        <ul className="evidence-list">
          {impact.evidence.map((evidence, index) => (
            <li key={`${evidence.kind}:${evidence.path}:${index}`}>
              <EvidenceIcon kind={evidence.kind} />
              <div>
                <code>
                  {evidence.path}
                  {evidence.line ? `:${evidence.line}` : ''}
                </code>
                <p>{evidence.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
