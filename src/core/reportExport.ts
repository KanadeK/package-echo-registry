import type { AnalysisReport, Evidence } from './model.js';
import { sanitizeReport } from './privacy.js';

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
  const sanitized = sanitizeReport(report);
  const lines = [
    '# Package Echo Registry report',
    '',
    `Generated: ${sanitized.generatedAt}`,
    `Root: ${sanitized.rootLabel}`,
    '',
    '## Summary',
    '',
    '| Packages | Consumers | Examples | Changes | Impacts | Migration tasks |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ${sanitized.summary.packages} | ${sanitized.summary.consumers} | ${sanitized.summary.examples} | ${sanitized.summary.changes} | ${sanitized.summary.impacts} | ${sanitized.summary.migrationTasks} |`,
    '',
    '## Impact paths',
    '',
  ];

  if (sanitized.impacts.length === 0) {
    lines.push('No downstream impacts were detected.', '');
  } else {
    lines.push('| Severity | Risk | Path | Evidence |', '| --- | --- | --- | --- |');
    for (const impact of sanitized.impacts) {
      lines.push(
        `| ${impact.severity} | ${impact.riskType} | ${escapeTableCell(impact.evidencePath.join(' -> '))} | ${escapeTableCell(evidenceText(impact.evidence))} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Migration checklist', '');
  if (sanitized.migrationTasks.length === 0) {
    lines.push('No migration tasks were generated.', '');
  } else {
    for (const task of sanitized.migrationTasks) {
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
