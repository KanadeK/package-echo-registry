# Benchmark

Recorded on 2026-07-28 with the committed v0.1.0 fixture and dependency lockfile.

## Environment

| Item         | Value                                 |
| ------------ | ------------------------------------- |
| CPU          | Intel Core i9-14900HX                 |
| Logical CPUs | 32                                    |
| Memory       | 31.8 GiB                              |
| OS           | Windows `10.0.26200` (`win32`)        |
| Node.js      | v24.18.0                              |
| Browser      | Bundled Playwright Chromium, headless |

## Fixture size

| Manifests | Graph nodes | Graph edges | API snapshots | Changesets | Source usages | Impacts | Tasks |
| --------: | ----------: | ----------: | ------------: | ---------: | ------------: | ------: | ----: |
|         8 |           8 |           9 |            10 |          2 |             9 |      11 |    11 |

The eight manifests represent five package units and three apps.

## Results

### Filesystem adapters plus domain analysis

The benchmark warms up three times, then performs 25 complete runs. Each measured run reads and
parses the fixture manifests, Changesets, API reports, and TypeScript sources before building the
report.

|  Minimum |   Median |      p95 |  Maximum |
| -------: | -------: | -------: | -------: |
| 13.87 ms | 18.24 ms | 23.13 ms | 25.20 ms |

### Production Web report readiness

The benchmark serves the production Vite build, navigates with Chromium, waits for the real
`11 matching results` state, and measures wall-clock time from navigation start to that state.

| Scenario              |    Result |
| --------------------- | --------: |
| First load            | 159.78 ms |
| 7 warm loads, minimum |  26.15 ms |
| 7 warm loads, median  |  28.21 ms |
| 7 warm loads, p95/max |  57.89 ms |

## Reproduce

```bash
npm ci
npm run benchmark
```

The command builds first, automatically selects a free loopback port, closes the browser/server,
and prints machine-readable JSON. Results vary with filesystem cache, antivirus, CPU power policy,
and host load. This fixture benchmark verifies that v0.1.0 is comfortably interactive; it is not a
large-monorepo scalability claim.
