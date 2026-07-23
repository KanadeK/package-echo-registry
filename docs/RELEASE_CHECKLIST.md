# Release Checklist

## Identity and history

- [ ] GitHub CLI authentication matches the intended owner.
- [ ] Every author and committer matches an approved contributor.
- [ ] Commit messages contain no unapproved `Co-authored-by` trailer.

## Product

- [ ] All fixture packages, apps, and version changes analyze offline.
- [ ] Breaking API evidence resolves to a concrete consumer file.
- [ ] Unchanged packages create no migration tasks.
- [ ] Every impact contains an evidence path.
- [ ] CLI, web import, filters, and exports use the real domain core.

## Quality

- [ ] Formatting, lint, type checking, coverage, E2E, and build pass.
- [ ] Core line coverage is at least 80 percent and critical rules target 90 percent.
- [ ] Keyboard, responsive, reduced-motion, and accessibility checks pass.
- [ ] Benchmark results describe the machine and input size.

## Distribution

- [ ] npm CLI archive installs and runs in a clean temporary directory.
- [ ] Static viewer archive opens with the synthetic report.
- [ ] Sample JSON and Markdown reports are current.
- [ ] `SHA256SUMS.txt` matches every release asset.
- [ ] Release assets contain no environment files, caches, tokens, or private data.

## GitHub

- [ ] CI, Security, Pages, and Release workflows are green.
- [ ] Pages responds successfully before setting the homepage.
- [ ] `main`, annotated tag `v0.1.0`, and release target the intended commit.
- [ ] GitHub contributors contain only verified human accounts.
