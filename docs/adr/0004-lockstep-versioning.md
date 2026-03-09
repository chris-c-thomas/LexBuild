# ADR-0004: Lockstep Versioning with Changesets

**Status:** Accepted
**Date:** 2024-12-01

## Context

LexBuild is a monorepo with three published npm packages that form a dependency
chain: `@lexbuild/cli` depends on `@lexbuild/usc` and `@lexbuild/core`, and
`@lexbuild/usc` depends on `@lexbuild/core`. During development, internal
dependencies use pnpm's `workspace:*` protocol to resolve to local source. On
publish, `workspace:*` is replaced with concrete version numbers in the published
`package.json`.

Consumers interact with these packages in several ways. Most install
`@lexbuild/cli` globally and use the `lexbuild` binary. Some may depend on
`@lexbuild/core` or `@lexbuild/usc` directly in their own projects — for example,
to use the XML parser, AST types, or converter programmatically. In all cases,
consumers need to know which versions of the packages are compatible with each
other.

Two versioning strategies were considered:

**Independent versioning** allows each package to have its own version and release
cadence. A breaking change in `core` would bump only `core`'s major version; `usc`
and `cli` would update their `core` dependency range in their own subsequent
releases. This is flexible but creates a compatibility matrix: consumers must
determine which versions of `core`, `usc`, and `cli` work together. With three
tightly coupled packages maintained by a small team, this overhead provides little
practical benefit and creates real risk of version mismatches in production. A
consumer who installs `@lexbuild/usc@1.3.0` with `@lexbuild/core@1.5.0` may
encounter subtle incompatibilities that neither package was tested against.

**Lockstep versioning** bumps all packages to the same version simultaneously.
Every release produces `@lexbuild/core@X.Y.Z`, `@lexbuild/usc@X.Y.Z`, and
`@lexbuild/cli@X.Y.Z` with matching version numbers. A consumer who installs
`@lexbuild/cli@1.4.0` knows immediately that it uses `@lexbuild/core@1.4.0`
and `@lexbuild/usc@1.4.0`. There is no compatibility question, no matrix to
consult, and no risk of version skew.

The choice of versioning tool also matters. npm's built-in `npm version` doesn't
handle monorepo coordination. Lerna was considered but is heavyweight and has had
maintenance uncertainty. Changesets is a lighter-weight tool designed specifically
for monorepo versioning, with first-class support for pnpm workspaces and both
lockstep (`fixed`) and coordinated-independent (`linked`) versioning modes.

## Decision

All published packages are versioned in lockstep using
[Changesets](https://github.com/changesets/changesets) with a `fixed` group. The
`.changeset/config.json` configuration places all three packages in a single fixed
group, so any changeset — regardless of which package it targets — bumps all
packages to the same version number.

The release workflow follows the standard Changesets pattern:

1. A contributor creates a changeset (`pnpm changeset`) describing their change
   and selecting a semver bump level (patch, minor, or major).
2. Changesets accumulate on the development branch across multiple PRs.
3. A Changesets-managed pull request ("Version Packages") applies all pending
   changesets, bumps all three packages in lockstep, updates each package's
   `CHANGELOG.md`, and updates cross-package dependency versions.
4. Merging that PR triggers the publish workflow, which builds all packages and
   publishes them to npm in dependency order.

The web app (`apps/web/`) is excluded from changesets entirely. It is marked
`"private": true` in its `package.json` and listed in the changeset config's
`ignore` array. It is not published to npm and follows no formal version scheme.

## Consequences

### Positive

- Zero ambiguity about compatibility. If a consumer has `@lexbuild/cli@1.4.2`,
  they know exactly which core and usc versions are in use. Bug reports,
  documentation, and support conversations all reference a single version number.
- Simple dependency management for consumers who use `@lexbuild/core` or
  `@lexbuild/usc` directly. They match versions across packages without needing
  a compatibility table or checking peer dependency ranges.
- Changesets integrates cleanly with pnpm workspaces and GitHub Actions. The
  `changeset-release/main` PR pattern automates changelog generation, version
  bumps, and cross-package dependency coordination.
- Contributors don't need to reason about which packages their change affects
  at the versioning level — they describe the change and select a bump level,
  and Changesets propagates it to all packages automatically.
- Changelogs are generated per-package, so consumers of a specific package can
  still see only changes relevant to that package, even though versions are
  synchronized.

### Negative

- Version noise: a release that only changes `@lexbuild/usc` (e.g., fixing a
  U.S. Code-specific edge case in duplicate section handling) still bumps
  `@lexbuild/core` to the same new version, even though core's code is
  unchanged. Consumers who pin exact versions will see unnecessary updates.
- Cannot release a hotfix to a single package independently. If a critical bug
  is found in `usc` but `core` has unreleased breaking changes on the development
  branch, both must be released together.
- As the number of source packages grows (cfr, state-*, etc.), lockstep becomes
  more aggressive — a fix to one state's converter bumps every other package.
  At some future point, migrating source packages to `linked` mode (coordinated
  but independently versioned) may become preferable.
- Changeset files (`.changeset/*.md`) accumulate in the repository between
  releases, adding noise to pull requests and the git history.

### Neutral

- The `workspace:*` protocol ensures local development always uses the latest
  local source regardless of published version numbers. Lockstep versioning is
  only relevant at publish time.
- Changesets supports both `fixed` and `linked` modes. Migrating from `fixed`
  to `linked` in the future is a configuration change in `.changeset/config.json`,
  not a code change. This provides an exit path if lockstep becomes too aggressive.
- The automated "Version Packages" PR pattern means version bumps are reviewable
  code changes, not imperative side-effect commands.

## Related

- [Architecture: versioning](../old/architecture.md#versioning) — lockstep versioning overview
- [Contributing guide](../../CONTRIBUTING.md) — changeset workflow for contributors
