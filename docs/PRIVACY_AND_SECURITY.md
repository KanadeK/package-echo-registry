# Privacy and Security

## Local-first boundary

The analyzer reads a root explicitly selected on the local machine. It does not call npm, GitHub,
or another registry, and it does not execute package scripts or import analyzed source modules. The
static viewer fetches only its bundled synthetic report unless the user selects a local report.

There is no analytics endpoint, account system, telemetry SDK, cookie, or cloud database in
v0.1.0.

## Data that a report contains

- package names, versions, and package kind;
- repository-relative manifest, API report, Changeset, and source paths;
- public API member names and normalized signatures;
- dependency relationships/ranges and directed graph paths;
- Changeset summaries, risk classifications, and migration actions.

These fields are necessary to make a finding reviewable. A report is therefore not anonymous and
should be handled with the same care as repository metadata.

## Data excluded by design

- absolute home/workspace paths;
- source file bodies;
- environment variable values or `.env` files;
- Git author names/emails;
- registry configuration files;
- cookies, authorization headers, or access tokens gathered from the environment.

The tool scans TypeScript syntax for imports but stores only the relative location, line, imported
package, and imported member names.

## Path confinement

All filesystem candidates are resolved against the selected root. Absolute paths, drive paths, UNC
paths, backslashes in imported report paths, NUL characters, and `.`/`..` path segments are rejected
where a repository-relative path is required. Diagnostics expose a stable code and safe relative
path, not file content.

This protects against accidental traversal through CLI options and malicious imported report JSON.
It does not replace operating-system access controls.

## Input and rendering safety

Manifests, Changesets, API reports, source syntax, and imported reports are untrusted input:

- Zod schemas reject missing/wrong types and unknown fields at the report boundary.
- Report integrity checks verify summary counts, format version, graph nodes, every path edge, and
  path endpoints.
- YAML and JSON parse errors fail closed with a non-zero CLI status.
- React renders values as text and does not use `dangerouslySetInnerHTML`.
- The analyzer never evaluates source, manifest scripts, or Changeset content.

## Output redaction

Before JSON/Markdown export and after report import, the sanitizer replaces representative:

- GitHub classic/fine-grained and npm tokens;
- AWS access-key identifiers;
- Bearer credentials;
- values assigned to token, API key, authorization, secret, password, cookie, and related names;
- passwords embedded in HTTP(S) URLs;
- PEM-style private-key blocks.

Privacy tests construct credential-shaped values at runtime and assert they are absent from imported
reports and both export formats. Release packaging also runs a repository secret scan.

## Residual risks

Redaction is deterministic defense in depth, not a general data-loss-prevention engine. An unusual
credential with no recognizable label or shape can evade it. Public API signatures and Changeset
summaries are intentionally retained and may contain organization-specific names or text.

Before sharing a report outside its repository:

1. review package names, paths, API signatures, and Changeset summaries;
2. run the release secret scanner;
3. distribute only the report, not local caches or source;
4. revoke any real credential that was ever written to an untrusted file, even if a later export
   appears redacted.

Static analysis can also miss dynamic imports or runtime behavior; absence of a finding is not a
security guarantee.

## Dependency and release controls

The lockfile pins the dependency graph. CI installs with `npm ci`, runs `npm audit`, scans secrets,
builds from source, exercises real browser flows, and packages from a clean checkout. Workflows use
minimum permissions. Release assets carry SHA-256 checksums and are validated after extraction.

Vulnerability reports should use GitHub's private Security Advisory flow described in
[SECURITY.md](../SECURITY.md).
