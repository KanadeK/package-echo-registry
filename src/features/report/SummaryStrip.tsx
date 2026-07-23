import type { ReportSummary } from '../../core/model.js';

export function SummaryStrip({ summary }: { summary: ReportSummary }) {
  const metrics = [
    ['Packages', summary.packages],
    ['Consumers', summary.consumers],
    ['Examples', summary.examples],
    ['Breaking changes', summary.breakingChanges],
    ['Impacts', summary.impacts],
    ['Migration tasks', summary.migrationTasks],
  ] as const;

  return (
    <dl className="summary-strip" aria-label="Analysis summary">
      {metrics.map(([label, value]) => (
        <div className="summary-metric" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
