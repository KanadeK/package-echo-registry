# Synthetic fixture monorepo

This directory is a deterministic, offline fixture for Package Echo Registry. All names, package
contents, API reports, and version changes are synthetic and licensed under the adjacent MIT
license.

It contains five package workspaces and three application workspaces:

- `@echo/core`, `@echo/react`, `@echo/node-adapter`, `@echo/testing`, and `@echo/theme`;
- `@echo/catalog-app`, `@echo/worker-app`, and `@echo/legacy-app`.

Two releases are represented by committed Changesets and API Extractor snapshots:

- `@echo/core` 1.0.0 to 2.0.0 removes `parseEnvelope` and changes `Envelope`;
- `@echo/node-adapter` 1.2.0 to 1.3.0 adds `createBatchTransport`.

The stale imports in `packages/react/src/EnvelopeView.tsx` and
`packages/testing/src/fixture.ts` are intentional evidence inputs. The fixture is not installed or
executed as an application.
