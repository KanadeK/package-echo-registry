# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Establish the repository, quality gates, architecture boundary, and release policies.
- Add deterministic API diffing, downstream graph propagation, peer-range checks, evidence paths,
  and migration-task generation.
- Add boundary coverage for mismatched API snapshots, unreachable graph paths, compatible peers,
  empty reports, and migration-task deduplication.
- Import workspace manifests, Changesets, API Extractor snapshots, and TypeScript source usages
  from a path-confined local adapter.
- Add a synthetic five-package, three-app monorepo with two version changes and reproducible
  source-level breaking-change evidence.
- Fix source-owner resolution across Windows sandbox path aliases and make formatting independent
  of a symlinked working directory.
- Deliver a production React explorer and Node CLI with report import, JSON and Markdown export,
  graph focus, filters, evidence details, migration checklists, and explicit non-happy states.
