# Package Echo Registry

Package Echo Registry traces package and SDK changes into the downstream consumers, examples,
and migration work they can affect. It is designed for SDK teams and monorepo maintainers who
need evidence at the source-file level rather than a release-note summary.

The v0.1.0 implementation is being built as a local-first analyzer with a Node CLI and a static
React report viewer. Analysis does not require a public package registry or source upload.

## Planned v0.1.0 contract

- Import package manifests, Changesets, and API Extractor report snapshots.
- Build package-to-consumer-to-example paths and attach source evidence.
- Detect breaking API, peer dependency, and example-usage risks.
- Export a migration checklist as JSON and Markdown.

## Repository status

The repository currently contains the versioned quality gates, project policies, architecture
boundary, and public-repository comparison used before implementation. Commands and screenshots
will be documented only after they are backed by runnable code.

## Public repository comparison

A public-repository sample search found no active project with the same name and a highly
isomorphic scope. The closest tools focus on versioning, isolated API compatibility, dependency
visualization, or build orchestration. See
[docs/COMPETITOR_SCAN.md](docs/COMPETITOR_SCAN.md) for the dated sample and differentiation.

## Privacy

The product is local-first. Future reports will contain repository-relative paths and extracted
public API signatures, but not file contents, credentials, environment files, or GitHub tokens.
See [docs/PRIVACY_AND_SECURITY.md](docs/PRIVACY_AND_SECURITY.md).

## License

[MIT](LICENSE)
