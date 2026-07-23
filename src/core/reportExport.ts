import type { AnalysisReport, Evidence } from './model.js';

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function evidenceText(evidence: Evidence[]): string {
  return evidence
    .map((item) => {
      const line = item.line ? `:${item.line}` : '';
      return `${item.path}${line}`;
    })
    .join(', ');
}

export function renderMarkdownReport(report: AnalysisReport): string {
  const lines = [
    '# Package Echo Registry report',
    '',
    `Generated: ${report.generatedAt}`,
    `Root: ${report.rootLabel}`,
    '',
    '## Summary',
    '',
    '| Packages | Consumers | Examples | Changes | Impacts | Migration tasks |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ${report.summary.packages} | ${report.summary.consumers} | ${report.summary.examples} | ${report.summary.changes} | ${report.summary.impacts} | ${report.summary.migrationTasks} |`,
    '',
    '## Impact paths',
    '',
  ];

  if (report.impacts.length === 0) {
    lines.push('No downstream impacts were detected.', '');
  } else {
    lines.push('| Severity | Risk | Path | Evidence |', '| --- | --- | --- | --- |');
    for (const impact of report.impacts) {
      lines.push(
        `| ${impact.severity} | ${impact.riskType} | ${escapeTableCell(impact.evidencePath.join(' -> '))} | ${escapeTableCell(evidenceText(impact.evidence))} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Migration checklist', '');
  if (report.migrationTasks.length === 0) {
    lines.push('No migration tasks were generated.', '');
  } else {
    for (const task of report.migrationTasks) {
      lines.push(
        `- [ ] **${task.title}**`,
        `  - Action: ${task.action}`,
        `  - Path: ${task.evidencePath.join(' -> ')}`,
        `  - Evidence: ${evidenceText(task.evidence)}`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
