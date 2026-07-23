# Privacy and Security

## Local-first boundary

The analyzer operates on a path selected by the user. It does not call npm, GitHub, or another
registry during analysis. The static viewer reads only a report selected by the user or the
repository's synthetic demo report.

## Collected data

The report may contain:

- package names and versions;
- repository-relative manifest, API report, and TypeScript source paths;
- public API member names and normalized signatures;
- dependency edges and Changeset summaries.

The report must not contain:

- absolute home-directory paths;
- source file bodies;
- environment variable values;
- package-manager credentials, cookies, or access tokens;
- Git author email addresses.

## Output safety

Paths are normalized relative to the analyzed root. Diagnostic messages use stable error codes and
safe relative paths. A secret-pattern scanner runs before release packaging, and privacy regression
tests check representative credential-shaped values.

## Threat model

Package manifests and API reports are untrusted input. Parsing is schema validated, traversal
outside the selected root is rejected, and report rendering uses React text nodes rather than raw
HTML. The tool does not execute package scripts or imported source code.
