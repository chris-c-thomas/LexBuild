# Gemini Context — LexBuild

## Project Overview

**LexBuild** is an open-source toolchain for U.S. legal texts. It transforms official source XML into structured Markdown with rich metadata, optimized for Large Language Models (LLMs), Retrieval-Augmented Generation (RAG) pipelines, and semantic search. It currently supports the **U.S. Code** (USLM schema), **eCFR** (Electronic Code of Federal Regulations), and the **Federal Register**.

The project is a monorepo built with **TypeScript**, **Node.js (>= 22)**, **pnpm workspaces**, and **Turborepo**.

### Core Architecture
- **XML to AST**: Uses `saxes` for SAX streaming to handle large XML files (some > 100MB) with low memory overhead.
- **AST to Markdown**: A shared pipeline in `@lexbuild/core` converts source-specific AST nodes into high-quality Markdown.
- **Atomic Units**: Legal content is typically segmented at the **Section** level, though higher granularities (Title, Chapter, Part) are supported.
- **Metadata**: Every Markdown file includes YAML frontmatter and is accompanied by a `_meta.json` sidecar for programmatic index-based access.

## Repository Structure

```text
lexbuild/
├── apps/
│   ├── astro/       # LexBuild web app (Astro 6, React 19, Tailwind 4)
│   └── api/         # REST Data API (Hono, SQLite, Meilisearch)
├── packages/
│   ├── core/        # Shared XML parsing, AST, Markdown rendering, and FS utilities
│   ├── usc/         # U.S. Code-specific logic and downloader
│   ├── ecfr/        # eCFR-specific logic and downloader
│   ├── fr/          # Federal Register-specific logic and downloader
│   ├── mcp/         # Model Context Protocol (MCP) server for AI agents
│   └── cli/         # Command-line interface (@lexbuild/cli)
├── scripts/         # Deployment and incremental update scripts
├── downloads/       # Raw XML source files (gitignored)
├── output/          # Converted Markdown output (gitignored)
├── fixtures/        # XML fragments and expected Markdown for testing
└── CLAUDE.md        # Comprehensive project-wide development guide
```

## Tech Stack

- **Runtime**: Node.js >= 22 (ESM)
- **Language**: TypeScript 5.x
- **Build System**: Turborepo + pnpm
- **XML Parsing**: `saxes` (SAX streaming)
- **Frontend**: Astro 6, React 19, Tailwind CSS 4, shadcn/ui
- **Backend/API**: Hono, SQLite (`better-sqlite3`), Meilisearch
- **Testing**: Vitest
- **Tooling**: ESLint, Prettier, Knip, Changesets

## Building and Running

### Prerequisites
- Node.js >= 22
- pnpm >= 10

### Common Commands

```bash
pnpm install                 # Install dependencies
pnpm turbo build            # Build all packages (excludes apps)
pnpm turbo test             # Run all tests
pnpm turbo lint             # Lint all packages
pnpm turbo typecheck        # Type-check all packages
pnpm turbo dev              # Rebuild packages on change
```

### Running the CLI Locally
After building, you can run the CLI directly from the source:
```bash
node packages/cli/dist/index.js download-usc --titles 1
node packages/cli/dist/index.js convert-usc --titles 1
```

### Application Development
```bash
pnpm turbo dev:astro --filter=@lexbuild/astro  # Web app (http://localhost:4321)
pnpm turbo dev:api --filter=@lexbuild/api      # REST API (http://localhost:4322)
```

## Development Conventions

### Coding Style
- **Naming**: `kebab-case.ts` for files, `PascalCase` for types/interfaces, `camelCase` for functions/variables.
- **Exports**: Use barrel exports via `index.ts` in each package's `src/` directory.
- **Documentation**: All exported functions and types MUST have JSDoc comments.
- **Type Safety**: Strict mode enabled. Avoid `any`; use `unknown` or explicit interfaces. Use `import type`.
- **Error Handling**: Use custom error classes with `cause` chaining. Never swallow errors silently.

### Testing Practices
- **Co-location**: Test files (`*.test.ts`) should be in the same directory as the source file.
- **Snapshots**: Use snapshot tests for Markdown output to ensure stability across version bumps.
- **Reproducibility**: Bug fixes must include a reproduction test case using fragments from `fixtures/`.

### Contribution Workflow
- **Changesets**: Use `pnpm changeset` to document changes and manage versions.
- **Monorepo Boundaries**: Packages should only depend on `@lexbuild/core`. Source packages (`usc`, `ecfr`, `fr`) must NOT depend on each other.
- **Linting/Formatting**: Prettier and ESLint are enforced via CI. Use `pnpm format` before committing.

## Key Files and Instruction Context

LexBuild uses a hierarchical documentation structure to provide context across the monorepo:

- **Root `CLAUDE.md`**: Primary reference for project-wide architecture, development workflows, and common pitfalls.
- **Package/App `CLAUDE.md`**: Each package and application contains its own `CLAUDE.md` with deep-dives into source-specific logic, module structures, and local conventions (e.g., `packages/core/CLAUDE.md`, `apps/astro/CLAUDE.md`).
- **`.github/copilot-instructions.md`**: Global AI instruction context for the repository.
- **`.github/instructions/*.md`**: Specialized AI instructions for different components, including:
    - `api.instructions.md`: Guidelines for the Hono/SQLite Data API.
    - `astro-ui.instructions.md`: UI and design guidelines for the Astro web application.
    - `documentation.instructions.md`: Standards for technical documentation.
    - `mcp.instructions.md`: Instructions for the Model Context Protocol server.
- **`turbo.json`**: Definition of the build, test, and lint task pipeline.
- **`.claude/rules/conventions.md`**: Core mandates for coding styles and architectural integrity.
- **`package.json`**: Root-level dependencies and workspace scripts.
