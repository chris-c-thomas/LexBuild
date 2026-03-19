# GitHub Copilot Instructions for LexBuild

## Start Here

- Read `README.md` for the current product overview, CLI usage, output structure, and development commands.
- Read `CLAUDE.md` for the repo-wide architecture, coding conventions, and package map.
- For task-specific details, jump to the closest package or app guide instead of inferring behavior from unrelated code:
  - `packages/core/CLAUDE.md`
  - `packages/usc/CLAUDE.md`
  - `packages/ecfr/CLAUDE.md`
  - `packages/cli/CLAUDE.md`
  - `apps/astro/CLAUDE.md`

Prefer linking to those files in comments, reviews, or generated docs instead of duplicating their detailed architecture notes.

## Repo Shape

- `packages/core` contains the shared XML parser, AST types/builders, Markdown renderer, frontmatter generation, link resolution, and resilient filesystem helpers.
- `packages/usc` and `packages/ecfr` are source-specific conversion/downloader packages. They are independent and should not import from each other.
- `packages/cli` is a thin command layer over the source packages.
- `apps/astro` is the website. It consumes generated Markdown and `_meta.json` output as data and does not import converter package code.
- `downloads/`, `output/`, `output-chapter/`, `output-part/`, and `output-title/` contain generated artifacts. Do not edit them unless the task explicitly targets generated output.

## Environment And Commands

- Use Node.js `>=22` and pnpm `>=10`.
- Install dependencies from the repo root with `pnpm install`.
- Common repo commands:
  - `pnpm turbo build`
  - `pnpm turbo test`
  - `pnpm turbo lint`
  - `pnpm turbo typecheck`
  - `pnpm turbo dev`
- Scope work with Turborepo filters when possible, for example `pnpm turbo test --filter=@lexbuild/usc`.
- To run the CLI locally, build first and then execute `node packages/cli/dist/index.js ...`.
- Use the current source-specific CLI commands: `download-usc`, `convert-usc`, `download-ecfr`, `convert-ecfr`.

## Working Conventions

- TypeScript is strict, ESM-only, and uses `import type` for type-only imports.
- Prefer `interface` over `type` for object shapes.
- Avoid `any`; use `unknown` unless there is a documented reason not to.
- Keep file names in kebab case and exported APIs documented with JSDoc.
- Preserve the existing package boundaries. Shared parsing/rendering logic belongs in `@lexbuild/core`; source-format-specific behavior belongs in the relevant source package.
- When writing many files from converters or tooling, use the resilient filesystem helpers exported by `@lexbuild/core` rather than raw `node:fs/promises` writes.
- Keep changes focused. Do not reformat or modernize unrelated code while solving a targeted task.

## Architecture Rules That Matter In Reviews

- The core pattern is XML stream -> source-specific builder -> LexBuild AST -> Markdown/frontmatter renderer -> file output.
- USC and eCFR use different XML formats and different builders. Do not assume a fix in one source package applies to the other.
- Converter pipelines collect parse results synchronously and write files after parsing. Avoid async I/O inside SAX event handlers.
- The Astro app is intentionally excluded from the default package build pipeline. Do not add a plain `build` script to `apps/astro/package.json`; use `build:astro` and `dev:astro`.

## Testing And Validation

- Tests are usually co-located with source files as `*.test.ts`.
- Snapshot stability matters for Markdown output. Update fixture expectations intentionally, not casually.
- For converter changes, prefer validating the affected package with targeted tests before escalating to repo-wide runs.

## Useful Entry Points

- `README.md` for current CLI usage and output examples
- `CLAUDE.md` for repo-wide conventions and architecture
- `package.json` for authoritative root scripts and engine requirements
- `turbo.json` for task wiring
- `eslint.config.js` for lint expectations
- `apps/astro/README.md` for web app setup and generated-content workflow

## Notes For Future Agent Customization

- If work frequently targets one area, add scoped instructions rather than expanding this file:
  - `packages/core/**` for parser/renderer guidance
  - `packages/usc/**` for USC conversion edge cases
  - `packages/ecfr/**` for eCFR structure and path rules
  - `apps/astro/**` for Astro UI and content-loading rules
- Keep this root file short and repo-wide. Put deep package behavior in the package-level `CLAUDE.md` files.