import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it } from 'vitest';

import { parseReportJson, serializeReportJson } from '../../src/adapters/reportImportAdapter.js';
import type { AnalysisReport } from '../../src/core/model.js';

const demoReportPath = fileURLToPath(new URL('../../public/demo-report.json', import.meta.url));
const original = readFileSync(demoReportPath, 'utf8');
let report: AnalysisReport;

beforeEach(() => {
  report = JSON.parse(original) as AnalysisReport;
});

describe('report import integrity', () => {
  it('rejects malformed JSON and unknown fields', () => {
    expect(() => parseReportJson('{')).toThrow(/not valid JSON/);
    expect(() =>
      parseReportJson(
        JSON.stringify({
          ...report,
          unexpected: true,
        }),
      ),
    ).toThrow(/does not match the report schema/);
  });

  it('rejects mismatched counts and unsupported format versions', () => {
    report.summary.impacts += 1;
    expect(() => parseReportJson(JSON.stringify(report))).toThrow(/counts do not match/);

    report = JSON.parse(original) as AnalysisReport;
    report.formatVersion += 1;
    expect(() => parseReportJson(JSON.stringify(report))).toThrow(/Unsupported report format/);
  });

  it('rejects absolute evidence paths and root labels', () => {
    report.changes[0]!.evidence[0]!.path = 'C:/Users/private/token.txt';
    expect(() => parseReportJson(JSON.stringify(report))).toThrow(
      /does not match the report schema/,
    );

    report = JSON.parse(original) as AnalysisReport;
    report.rootLabel = '/private/workspace';
    expect(() => parseReportJson(JSON.stringify(report))).toThrow(
      /does not match the report schema/,
    );
  });

  it('rejects paths that reference missing graph nodes or edges', () => {
    report.graph.edges = report.graph.edges.filter(
      (edge) =>
        edge.from !== report.impacts[0]!.evidencePath[0] ||
        edge.to !== report.impacts[0]!.evidencePath[1],
    );
    expect(() => parseReportJson(JSON.stringify(report))).toThrow(/missing graph edge/);

    report = JSON.parse(original) as AnalysisReport;
    report.impacts[0]!.evidencePath[1] = '@echo/unknown';
    expect(() => parseReportJson(JSON.stringify(report))).toThrow(/unknown graph node/);
  });

  it('round-trips a valid report deterministically', () => {
    const normalized = serializeReportJson(parseReportJson(original));
    expect(serializeReportJson(parseReportJson(normalized))).toBe(normalized);
    expect(JSON.parse(normalized)).toEqual(JSON.parse(original));
  });
});
