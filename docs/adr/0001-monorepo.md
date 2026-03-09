# ADR-0001: Monorepo with pnpm Workspaces and Turborepo

**Status:** Accepted
**Date:** 2024-12-01

## Context

LexBuild's goal is to convert legislative XML into structured Markdown for AI/RAG
ingestion. The U.S. Code is the first supported source, but the project was designed
from the start to accommodate additional legal corpora — the Code of Federal
Regulations, state statutes, and others. Each source has its own XML schema, download
process, and conversion quirks, but they all share a common pipeline: parse XML,
build an AST, render Markdown with frontmatter, and write output files.

This created a code-sharing problem. The XML parser, AST types, Markdown renderer,
frontmatter generator, and link resolver are format-agnostic infrastructure that
every source package needs. Source-specific logic (element handlers, downloaders,
output directory conventions) must remain separate so that adding a new source
doesn't require touching existing ones. The CLI sits on top and delegates to
whichever source packages are available.

Three approaches were considered:

1. **Single package** — all sources mixed together. Simple to start, but creates
   tight coupling. A contributor working on CFR support would need to understand
   the U.S. Code element handlers. Testing becomes entangled. The package grows
   without bound as sources are added.

2. **Multi-repo** — each package in its own repository. Maximum isolation, but
   atomic cross-package changes (e.g., adding a new AST node type used by a source
   package) require coordinated PRs across repos. CI must be configured independently
   for each repo. Version coordination requires external tooling.

3. **Monorepo** — all packages in one repository with workspace-aware tooling.
   Shared CI, atomic commits, unified versioning, with package boundaries enforced
   by the workspace protocol.

## Decision

We adopted a monorepo using pnpm workspaces for dependency management and Turborepo
for build orchestration. The repository is organized in three layers:

- **Core** (`packages/core/`) — format-agnostic infrastructure with no internal
  dependencies. Builds first. Exports the XML parser, AST types, AST builder,
  Markdown renderer, frontmatter generator, and link resolver.
- **Source packages** (`packages/usc/`, and future `packages/cfr/`, etc.) — each
  depends on core, independent of other source packages. Implements source-specific
  conversion logic, downloaders, and file writers.
- **CLI and apps** (`packages/cli/`, `apps/web/`) — depend on core and one or more
  source packages. The CLI provides the user-facing binary; apps consume LexBuild's
  output files rather than its code.

All internal dependencies use pnpm's `workspace:*` protocol, so packages resolve
to local source during development and are replaced with concrete version numbers
on publish. Turborepo resolves the dependency graph automatically: `core` builds
first, then `usc`, then `cli`. Tests run after their package's build completes.
Linting runs in parallel with everything else since it has no build dependency.

## Consequences

### Positive

- Atomic cross-package changes: a breaking change in core's AST types can be
  updated in core, usc, and cli in a single commit with a single CI run. No
  need to coordinate PRs across repositories.
- Unified CI pipeline: one GitHub Actions workflow builds, tests, lints, and
  type-checks all packages. Contributors run `pnpm turbo test` and get results
  for the entire project.
- Shared tooling configuration: a single `tsconfig.base.json`, ESLint config,
  Prettier config, and Vitest setup shared across all packages. Configuration
  changes propagate automatically — no risk of drift between repos.
- Turborepo's dependency-aware caching means unchanged packages are not rebuilt,
  keeping CI fast even as the repo grows. A change to `usc` only rebuilds `usc`
  and `cli`, not `core`.
- New source packages follow a well-defined pattern: create `packages/{source}/`,
  depend on `@lexbuild/core`, implement a converter function analogous to
  `convertTitle()`, add a CLI command, and document the source's schema.

### Negative

- Initial setup complexity is higher than a single-package project. Contributors
  must understand pnpm workspaces, Turborepo pipelines, and the `workspace:*`
  protocol before they can effectively navigate the build system.
- All packages are built together by default. A change to `core` triggers
  rebuilds of `usc` and `cli`, even if the change is internal and doesn't
  affect the public API surface. Turborepo caching mitigates this but does
  not eliminate it entirely.
- The web app (`apps/web/`) required special handling — it is excluded from
  the default `pnpm turbo build` task because it depends on generated content
  files that aren't committed to git. This exception adds a wrinkle to the
  otherwise uniform build pipeline.
- Publish workflows must handle multiple packages atomically, which adds
  complexity to the release process and requires Changesets coordination.

### Neutral

- The monorepo pattern is well-established in the JavaScript ecosystem. pnpm
  workspaces and Turborepo are mature tools with active maintenance and strong
  community adoption.
- Package boundaries enforce API discipline — core must export a clean public
  API since source packages consume it through the workspace protocol, not by
  reaching into internal modules.
- Future apps (API server, RAG demo) slot into the `apps/` directory without
  disrupting the package layer or requiring changes to the build pipeline.
- The `fixtures/` directory at the repo root is shared by all packages for
  integration testing, avoiding duplication of test data.

## Related

- [Architecture overview](../old/architecture.md) — monorepo structure and dependency graph
- [Build pipeline](../old/architecture.md#build-order) — Turborepo build order and workspace protocol
- [Extending LexBuild](../extending.md) — guide for adding new source packages
