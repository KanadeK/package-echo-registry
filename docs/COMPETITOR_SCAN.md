# Public Repository Sample Scan

Scan date: 2026-07-23  
GitHub account used for the scan: `KanadeK`  
Method: GitHub CLI repository search and public repository metadata

## Name checks

The following searches returned no repositories:

- exact phrase `Package Echo Registry`;
- slug query `package-echo-registry in:name`.

The repository `KanadeK/package-echo-registry` did not exist at scan time. The default project name
and slug therefore remain unchanged.

## Relevant public repositories

Stars and last-push timestamps are a point-in-time sample and will drift.

| Repository                                                        |  Stars | Last push (UTC) | Primary function                                     | Overlap with this project                                                                                                            |
| ----------------------------------------------------------------- | -----: | --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [microsoft/rushstack](https://github.com/microsoft/rushstack)     |  6,484 | 2026-07-23      | Rush monorepo tools, including API Extractor         | Produces and models API reports; it does not connect a package API change to consumer source evidence and migration tasks.           |
| [changesets/changesets](https://github.com/changesets/changesets) | 12,160 | 2026-07-23      | Monorepo versioning and changelog management         | Supplies version intent used by this project; it does not calculate downstream source impact.                                        |
| [nrwl/nx](https://github.com/nrwl/nx)                             | 29,128 | 2026-07-23      | Monorepo builds, affected tasks, and CI optimization | Its affected graph is build-task oriented; this project focuses on API, peer-range, example, and migration evidence.                 |
| [vercel/turborepo](https://github.com/vercel/turborepo)           | 30,771 | 2026-07-23      | JavaScript and TypeScript build orchestration        | Computes task dependencies and cache scope rather than API compatibility or consumer file migration work.                            |
| [moonrepo/moon](https://github.com/moonrepo/moon)                 |  4,010 | 2026-07-19      | Web-ecosystem monorepo build and management          | Shares local graph discovery, but its result drives task execution rather than evidence-backed migration planning.                   |
| [semrel-extra/topo](https://github.com/semrel-extra/topo)         |      6 | 2026-06-29      | Monorepo dependency traversal helpers                | Shares graph traversal only; it does not import API reports or resolve source usages.                                                |
| [timdp/depviz](https://github.com/timdp/depviz)                   |      1 | 2023-03-03      | Intra-monorepo dependency visualization              | Shares visualization, while this project adds version-diff rules, risk classification, evidence, and exports.                        |
| [clerk/break-check](https://github.com/clerk/break-check)         |      1 | 2026-07-18      | TypeScript package API breaking-change detection     | Shares TypeScript API comparison; it does not propagate findings across package, app, and example paths.                             |
| [alien-tools/roseau](https://github.com/alien-tools/roseau)       |     40 | 2026-07-20      | Java library API compatibility analysis              | Shares breaking-change analysis but targets Java libraries and isolated compatibility, not JS monorepo migration paths.              |
| [oasdiff/oasdiff](https://github.com/oasdiff/oasdiff)             |  1,280 | 2026-07-23      | OpenAPI diff and breaking-change detection           | Shares compatibility classification, but its input is an OpenAPI contract rather than package manifests and API Extractor snapshots. |

## Differentiation decision

No sampled repository overlaps more than roughly 70 percent of the MVP contract. Package Echo
Registry keeps its original scope and strengthens one boundary: a finding is not reportable unless
it has a directed package-to-consumer-to-example path or a direct consumer manifest/source
location. This makes it an evidence and migration layer that can complement Changesets, API
Extractor, Nx, or Turborepo rather than replace them.

This is a sampled public-repository comparison, not a claim of global uniqueness.
