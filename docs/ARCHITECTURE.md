# Architecture

Package Echo Registry uses a ports-and-adapters structure so that the analysis is deterministic
without a browser, network connection, or public registry.

## Dependency direction

`src/core` owns report schemas, API-diff rules, graph propagation, risk classification, and
migration planning. It does not read files or access browser globals.

`src/adapters` translates package manifests, Changesets, API Extractor snapshots, source files, and
browser report imports into core inputs. Adapter errors preserve the input path and a safe error
code without exposing file contents.

`src/features` coordinates the web interface. It consumes an already generated report and never
silently substitutes demo data for a failed import.

`src/cli` owns command parsing, calls the file adapter, and writes JSON or Markdown reports.

`src/workers` contains browser-only computation that can move off the UI thread. Worker inputs and
outputs use the same versioned report schema as the CLI.

## Evidence contract

Every reported impact must contain:

1. the changed package and change identifier;
2. a directed path through the package graph;
3. a repository-relative consumer source location or manifest location;
4. the rule that produced the risk;
5. a deterministic migration action.

An unchanged package may appear in the dependency graph, but it cannot create a migration task.
