import type { AnalysisReport } from './model.js';

const REDACTED = '[REDACTED]';

const tokenPatterns: ReadonlyArray<[RegExp, string]> = [
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, `${REDACTED}_GITHUB_TOKEN`],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, `${REDACTED}_GITHUB_TOKEN`],
  [/\bnpm_[A-Za-z0-9]{20,}\b/g, `${REDACTED}_NPM_TOKEN`],
  [/\bAKIA[0-9A-Z]{16}\b/g, `${REDACTED}_AWS_ACCESS_KEY`],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi, `Bearer ${REDACTED}`],
];

const privateKeyPattern =
  /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9]+ )?PRIVATE KEY-----/gi;
const namedSecretPattern =
  /((?:authorization|api[\s_-]?key|access[\s_-]?token|auth[\s_-]?token|token|client[\s_-]?secret|secret|password|passwd|cookie)["']?\s*[:=]\s*["']?)([^"'\s,;}\]]{6,})/gi;
const credentialUrlPattern = /(https?:\/\/[^:/\s]+:)([^@\s/]+)(@)/gi;

export function redactSensitiveText(value: string): string {
  let redacted = value.replace(privateKeyPattern, `${REDACTED}_PRIVATE_KEY`);
  for (const [pattern, replacement] of tokenPatterns) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted
    .replace(namedSecretPattern, `$1${REDACTED}`)
    .replace(credentialUrlPattern, `$1${REDACTED}$3`);
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactSensitiveText(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redactValue(nestedValue)]),
    );
  }
  return value;
}

export function sanitizeReport(report: AnalysisReport): AnalysisReport {
  return redactValue(report) as AnalysisReport;
}
