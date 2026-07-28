import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseReportJson, serializeReportJson } from '../../src/adapters/reportImportAdapter.js';
import type { AnalysisReport } from '../../src/core/model.js';
import { redactSensitiveText } from '../../src/core/privacy.js';
import { renderMarkdownReport } from '../../src/core/reportExport.js';

const demoReportPath = fileURLToPath(new URL('../../public/demo-report.json', import.meta.url));

function demoReport(): AnalysisReport {
  return JSON.parse(readFileSync(demoReportPath, 'utf8')) as AnalysisReport;
}

describe('privacy redaction', () => {
  it('redacts common credential shapes without storing credential literals in the test', () => {
    const githubToken = `ghp_${'A'.repeat(24)}`;
    const npmToken = `npm_${'b'.repeat(24)}`;
    const awsKey = `AKIA${'C'.repeat(16)}`;
    const keyLabel = ['PRIVATE', 'KEY'].join(' ');
    const privateKey = [
      `-----BEGIN ${keyLabel}-----`,
      'sensitive-material',
      `-----END ${keyLabel}-----`,
    ].join('\n');
    const text = [
      `Authorization: Bearer ${githubToken}`,
      `api_key="${npmToken}"`,
      `AWS=${awsKey}`,
      'https://build-user:super-secret-password@example.invalid/archive',
      privateKey,
    ].join('\n');

    const redacted = redactSensitiveText(text);

    expect(redacted).not.toContain(githubToken);
    expect(redacted).not.toContain(npmToken);
    expect(redacted).not.toContain(awsKey);
    expect(redacted).not.toContain('super-secret-password');
    expect(redacted).not.toContain('sensitive-material');
    expect(redacted).toContain('[REDACTED]');
  });

  it('sanitizes imported reports and both public export formats', () => {
    const secret = `github_pat_${'x'.repeat(30)}`;
    const report = demoReport();
    report.changes[0]!.evidence[0]!.detail = `token=${secret}`;
    report.migrationTasks[0]!.action = `Use Authorization: Bearer ${secret}`;

    const imported = parseReportJson(JSON.stringify(report));
    const json = serializeReportJson(report);
    const markdown = renderMarkdownReport(report);

    expect(imported.changes[0]!.evidence[0]!.detail).not.toContain(secret);
    expect(json).not.toContain(secret);
    expect(markdown).not.toContain(secret);
    expect(`${json}\n${markdown}`).toContain('[REDACTED]');
  });
});
