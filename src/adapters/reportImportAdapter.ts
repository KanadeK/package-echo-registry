import type { AnalysisReport } from '../core/model.js';
import { PROJECT_METADATA } from '../core/projectMetadata.js';
import { reportSchema } from '../core/schema.js';
import { AdapterError } from './errors.js';

function assertReportIntegrity(report: AnalysisReport): void {
  if (report.formatVersion !== PROJECT_METADATA.reportFormatVersion) {
    throw new AdapterError(
      'INVALID_JSON',
      'imported-report.json',
      `Unsupported report format version ${report.formatVersion}.`,
    );
  }
  if (
    report.summary.changes !== report.changes.length ||
    report.summary.impacts !== report.impacts.length ||
    report.summary.migrationTasks !== report.migrationTasks.length
  ) {
    throw new AdapterError(
      'INVALID_JSON',
      'imported-report.json',
      'Report summary counts do not match report contents.',
    );
  }

  const nodeIds = new Set(report.graph.nodes.map((node) => node.id));
  const edgePairs = new Set(report.graph.edges.map((edge) => `${edge.from}\u0000${edge.to}`));
  for (const impact of report.impacts) {
    if (
      impact.evidencePath[0] !== impact.changedPackage ||
      impact.evidencePath.at(-1) !== impact.targetPackage
    ) {
      throw new AdapterError(
        'INVALID_JSON',
        'imported-report.json',
        `Impact ${impact.id} has inconsistent path endpoints.`,
      );
    }
    for (const nodeId of impact.evidencePath) {
      if (!nodeIds.has(nodeId)) {
        throw new AdapterError(
          'INVALID_JSON',
          'imported-report.json',
          `Impact ${impact.id} references an unknown graph node.`,
        );
      }
    }
    for (let index = 0; index < impact.evidencePath.length - 1; index += 1) {
      const from = impact.evidencePath[index];
      const to = impact.evidencePath[index + 1];
      if (!edgePairs.has(`${from}\u0000${to}`)) {
        throw new AdapterError(
          'INVALID_JSON',
          'imported-report.json',
          `Impact ${impact.id} references a missing graph edge.`,
        );
      }
    }
  }
}

export function parseReportJson(text: string): AnalysisReport {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new AdapterError(
      'INVALID_JSON',
      'imported-report.json',
      'The selected report is not valid JSON.',
    );
  }
  const result = reportSchema.safeParse(raw);
  if (!result.success) {
    throw new AdapterError(
      'INVALID_JSON',
      'imported-report.json',
      'The selected JSON does not match the report schema.',
    );
  }
  const report = result.data as AnalysisReport;
  assertReportIntegrity(report);
  return report;
}

export function serializeReportJson(report: AnalysisReport): string {
  assertReportIntegrity(report);
  return `${JSON.stringify(report, null, 2)}\n`;
}
