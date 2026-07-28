# Package Echo Registry v0.1.0

Package Echo Registry turns local package and SDK changes into evidence-backed downstream impact
paths and migration work. It operates offline against a monorepo and never requires a public
registry.

## Highlights

- Import npm-compatible workspace manifests, Changesets, API Extractor snapshots, and static
  TypeScript source usages.
- Detect removed or changed public API, incompatible peer ranges, and affected consumers or
  examples.
- Produce directed evidence paths and deduplicated migration checklists in a Node CLI and a static
  React viewer.
- Export schema-validated JSON and Markdown with defense-in-depth secret redaction.
- Reproduce the product offline with a committed five-package, three-app fixture and two version
  changes.

## Release assets

- `package-echo-registry-0.1.0-cli-any.tgz`: installable, dependency-free bundled CLI.
- `package-echo-registry-0.1.0-web-any.zip`: static Web viewer containing only the synthetic demo.
- `package-echo-registry-0.1.0-sample-report-any.json`: schema-validated fixture report.
- `package-echo-registry-0.1.0-sample-report-any.md`: human-readable fixture report.
- `SHA256SUMS.txt`: SHA-256 digest for every downloadable asset.

The packaging gate installs or extracts both executable archives in clean temporary directories,
runs the CLI against the committed fixture, validates the resulting report, and verifies every
checksum.

## Verification baseline

- 43 Vitest tests: 35 unit and 8 integration.
- 4 Playwright browser journeys covering real evidence, axe accessibility, keyboard state,
  compound filters, network and import recovery, exports, and mobile layout.
- Core coverage: 97.96% lines, 86.95% branches, 97.36% functions, and 98.06% statements.
- Linux full gate plus Windows and macOS unit/integration CI.
- npm dependency audit, repository secret scan, workflow policy check, production build, docs/link
  validation, and clean-room release smoke tests.

## Known limits

v0.1.0 models named static TypeScript imports. Dynamic imports, re-export chains, runtime
reflection, JavaScript-only consumers, and behavioral compatibility are outside the current model.
It consumes existing API Extractor snapshots rather than invoking API Extractor, and its Web
migration checklist is session-local.

See the [English README](../README.md), [简体中文说明](../README.zh-CN.md), and
[architecture](ARCHITECTURE.md) for full usage and design details.
