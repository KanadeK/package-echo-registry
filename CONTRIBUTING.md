# Contributing

Thank you for improving Package Echo Registry.

## Development agreement

1. Use Node.js 22.12 or newer.
2. Install the exact dependency graph with `npm ci`.
3. Keep domain rules pure and local-first. File-system or browser behavior belongs in adapters.
4. Add a regression test for every corrected defect.
5. Run `npm run verify` before opening a pull request.

Changes must not weaken type checking, coverage thresholds, privacy redaction, or release checks.
Synthetic fixtures belong under `examples/` and must not contain real credentials or personal
data.

## Commit identity

Commits must use the contributor's own GitHub identity. Do not add automated or unapproved
`Co-authored-by` trailers.
