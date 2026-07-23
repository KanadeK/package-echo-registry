# Security Policy

## Supported version

Security fixes are provided for the latest published minor release.

## Reporting a vulnerability

Use the repository's private GitHub Security Advisory form. Do not open a public issue containing
credentials, exploitable repository paths, or unpublished vulnerability details.

Reports should include the affected version, reproduction steps, expected impact, and any safe
mitigation already tested. A maintainer will acknowledge a complete report within seven days.

## Security boundary

Package Echo Registry analyzes local files. It does not need a registry token, GitHub token, or
cloud account. Reports must use repository-relative paths and must not embed environment variables,
file contents, or credentials.
