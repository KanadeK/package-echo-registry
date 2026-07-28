# Package Echo Registry

[![CI](https://github.com/KanadeK/package-echo-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/KanadeK/package-echo-registry/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/KanadeK/package-echo-registry)](https://github.com/KanadeK/package-echo-registry/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[简体中文](README.zh-CN.md)

Package Echo Registry is a local-first TypeScript analyzer for SDK teams and monorepo
maintainers. It connects package/API changes to downstream consumers, examples, concrete source
locations, and migration work. The current release line is **v0.1.0**.

Unlike a release-note generator or a generic affected-task graph, every reported impact must carry
a directed package path and repository-relative evidence.

![Package Echo Registry showing the real synthetic monorepo report](docs/assets/dashboard.png)

## Why use it

- Compare previous and current API Extractor JSON snapshots.
- Import npm-compatible workspace manifests and Changesets.
- Resolve named TypeScript imports to consumer files and lines with ts-morph.
- Detect removed/signature-changed APIs, incompatible peer ranges, and example breakage.
- Traverse package-to-consumer-to-example paths with Graphology.
- Produce reviewable evidence, risk levels, and deduplicated migration tasks.
- Explore the same versioned report in a keyboard-accessible React viewer.
- Export validated JSON and Markdown without contacting a registry or uploading source.

## Quick start

Requirements: Node.js 22.12 or newer and npm.

```bash
git clone https://github.com/KanadeK/package-echo-registry.git
cd package-echo-registry
npm ci
npm run demo
npm run dev
```

`npm run demo` analyzes the committed offline fixture and writes:

- `dist-demo/package-echo-report.json`
- `dist-demo/package-echo-report.md`

The development server opens the same report in the Web explorer. No public registry or GitHub
token is needed.

## Real input to real output

The fixture contains five package units, three apps, ten API snapshots, two Changesets, and nine
source usages. Its previous `@echo/core` snapshot exports `parseEnvelope`; v2 removes it while
`@echo/react` still imports it and declares the incompatible peer range `^1.0.0`.

```text
@echo/core
  -> @echo/react (packages/react/package.json)
  -> @echo/catalog-app (apps/catalog/package.json)

source: apps/catalog/src/main.tsx:1
risk:   example-breakage / high
task:   Migrate @echo/catalog-app away from parseEnvelope
```

The real demo result is 7 changes, 11 downstream impacts, and 11 migration tasks. Unchanged
`@echo/theme` and the non-breaking `@echo/node-adapter` release do not create migration work.

## Analyze another monorepo

The root must contain npm-compatible `workspaces`, previous/current API Extractor JSON directories,
and optionally `.changeset/*.md` files. TypeScript and TSX files under each workspace are scanned
for named imports.

```bash
npm run analyze -- /path/to/monorepo \
  --previous-api api-reports/previous \
  --current-api api-reports/current \
  --output dist-demo
```

Use an injected timestamp for reproducible reports:

```bash
npm run analyze -- /path/to/monorepo \
  --generated-at 2026-07-23T12:00:00.000Z
```

### CLI commands

| Command                       | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `package-echo analyze [root]` | Analyze a local workspace and write JSON plus Markdown.                  |
| `package-echo demo`           | Run the committed deterministic fixture.                                 |
| `package-echo validate FILE`  | Validate schema version, counts, graph nodes, edges, and path endpoints. |

The GitHub release includes an installable npm archive. After downloading it:

```bash
npm install --global ./package-echo-registry-0.1.0.tgz
package-echo demo
```

## Web explorer

The static React/Vite viewer loads `public/demo-report.json` by default. `Open report` accepts a
local report; it does not upload the file. The graph, severity/risk/search filters, evidence panel,
migration checklist, demo reset, and JSON/Markdown downloads all operate on validated report data.

The viewer includes explicit loading, invalid-report, empty-filter, and empty-migration states. SVG
graph nodes support Enter and Space, layouts collapse at 920 px and 640 px, and motion honors
`prefers-reduced-motion`.

## Input and report contract

Supported inputs:

- root `package.json` with an npm-compatible `workspaces` array or `workspaces.packages`;
- workspace manifests with name, version, dependency maps, and optional
  `packageEcho.kind` (`package`, `consumer`, or `example`);
- Changesets with YAML front matter;
- API Extractor `Package` JSON snapshots with recursive members;
- TypeScript/TSX named imports.

The Zod-validated report format is versioned independently from the package. It contains summary
counts, graph nodes/edges, normalized changes, impacts, evidence paths, and migration tasks.
Imported reports must have internally consistent counts and real graph edges.

## Architecture

The dependency direction is:

```text
local files -> adapters -> AnalysisInput -> pure domain core -> AnalysisReport
                                                     |-> CLI JSON/Markdown
                                                     `-> static Web viewer
```

`src/core` owns diffing, graph propagation, peer-range rules, risk classification, privacy
sanitization, and migration planning. `src/adapters` owns untrusted file/report parsing.
`src/cli` and `src/features` are delivery layers. See
[Architecture](docs/ARCHITECTURE.md) for invariants, failure semantics, and extension points.

## Tests and quality gates

```bash
npm run verify
```

The verified v0.1.0 suite contains:

| Layer       | Count | What it verifies                                                                   |
| ----------- | ----: | ---------------------------------------------------------------------------------- |
| Unit        |    35 | Domain rules, schemas, redaction, filesystem mappings, formatting, regressions.    |
| Integration |     8 | Real fixture files, CLI outputs, malformed inputs, traversal, duplicate snapshots. |
| Browser E2E |     4 | Real evidence, axe, keyboard/filter state, 503 recovery, import/export, mobile.    |

Core line coverage is 97.96% and branch coverage is 86.95% on the recorded release gate, above the
80% threshold. The full gate also checks formatting, ESLint, strict TypeScript, production build,
and the generated demo. See [Benchmark](docs/BENCHMARK.md) for measured analysis and page timings.

## Privacy and security

Analysis is offline and never executes code from the analyzed workspace. Paths are confined to the
selected root and emitted as POSIX-style relative paths. Imported JSON is strict-schema validated,
React renders text without raw HTML, and exports redact common GitHub/npm/AWS credentials, Bearer
tokens, named secrets, URL passwords, cookies, and private-key blocks.

Reports intentionally contain package names, versions, public API signatures, Changeset summaries,
and repository-relative paths. Redaction is defense in depth, not a general DLP system; review a
report before sharing it outside its repository. See
[Privacy and security](docs/PRIVACY_AND_SECURITY.md) and [Security policy](SECURITY.md).

## Non-goals and current limitations

- It does not publish packages, calculate changelogs, run workspace scripts, or rewrite consumers.
- It does not call npm/GitHub or infer registry popularity.
- v0.1.0 resolves named static TypeScript imports; dynamic imports, re-export chains, runtime
  reflection, JavaScript-only consumers, and behavioral compatibility remain outside its model.
- It consumes existing API Extractor snapshots; it does not invoke API Extractor for you.
- The Web checklist is session-local and is not a project-management database.
- Findings are evidence-backed static analysis, not a guarantee that every runtime failure is
  detected.

## Comparison with adjacent tools

A dated public-repository sample found no active project with the same name and a highly isomorphic
scope. This is not a claim of global uniqueness.

- Changesets supplies version intent; this project resolves downstream source impact.
- API Extractor supplies API models; this project propagates their changes through a monorepo.
- Nx/Turborepo computes affected tasks; this project produces API/peer/example evidence and
  migration actions.
- API diff tools focus on an isolated contract; this project follows the contract into consumers.

See [the full sampled comparison](docs/COMPETITOR_SCAN.md).

## Roadmap

Candidate next milestones are re-export and dynamic-import modeling, Git revision adapters for
snapshot selection, configurable severity policy, very-large-graph worker execution, and CI review
annotations. They will preserve the versioned report contract and offline core.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), add a regression test for corrected defects, and run
`npm run verify`. Commits must use the contributor's own GitHub identity and must not add
unapproved `Co-authored-by` trailers.

## FAQ

### Does it upload my repository?

No. The CLI reads the selected local root; the static viewer reads a local JSON report.

### Does a Changeset alone create a breaking impact?

No. Release intent is recorded, but migration tasks require breaking API, peer-range, or downstream
evidence.

### Can it replace API Extractor or Changesets?

No. It deliberately composes their outputs and adds the evidence/migration layer.

### Can I open a report without the CLI?

Yes. Use the static GitHub Pages viewer and select a compatible report JSON file.

## License

[MIT](LICENSE)
