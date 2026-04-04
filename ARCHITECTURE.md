# Architecture

LexBuild converts U.S. legal source data into structured Markdown for AI/RAG ingestion and serves it through a web application and a REST API. It is organized as a TypeScript monorepo with five packages and two applications, arranged in three dependency layers.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 3: APPLICATIONS                               │
│                                                                               │
│     @lexbuild/cli              apps/astro                 apps/api            │
│  ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐  │
│  │ CLI binary        │      │ Web app           │      │ Data API          │  │
│  │ npm: lexbuild     │      │ lexbuild.dev      │      │ lexbuild.dev/api  │  │
│  │                   │      │                   │      │                   │  │
│  │ Orchestrates      │      │ Reads .md files   │      │ Reads SQLite DB   │  │
│  │ download/convert  │      │ from filesystem   │      │ built by CLI      │  │
│  │ via source pkgs   │      │                   │      │                   │  │
│  └────────┬──────────┘      └───────────────────┘      └────────┬──────────┘  │
│           │                       ▲ output files                 ▲ database   │
│           │                       │                              │            │
│       imports                     │                              │            │
│           │             ┌─────────┴──────────────────────────────┘            │
│           │             │                                                     │
│           │             │ CLI produces output that apps consume:              │
│           │             │ • .md files -> web app reads from filesystem        │
│           │             │ • SQLite DB -> API queries for JSON responses       │
│           │             │ • Data boundary only, not a code dependency         │
│           │             │                                                     │
├───────────┼─────────────┼─────────────────────────────────────────────────────┤
│                           LAYER 2: SOURCE PACKAGES                            │
│                                                                               │
│  ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐  │
│  │ @lexbuild/usc     │      │ @lexbuild/ecfr    │      │ @lexbuild/fr      │  │
│  │                   │      │                   │      │                   │  │
│  │ U.S. Code         │      │ eCFR (CFR)        │      │ Federal Register  │  │
│  │ USLM 1.0 XML      │      │ GPO/SGML XML      │      │ GPO XML + JSON    │  │
│  └────────┬──────────┘      └────────┬──────────┘      └────────┬──────────┘  │
│           │                          │                          │             │
│           └──────────────────────────┼──────────────────────────┘             │
│                                      │                                        │
│                                 each imports                                  │
│                                      │                                        │
├──────────────────────────────────────┼────────────────────────────────────────┤
│                        LAYER 1: CORE INFRASTRUCTURE                           │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ @lexbuild/core                                                          │  │
│  │                                                                         │  │
│  │ SAX parser · AST types · Markdown renderer · Frontmatter                │  │
│  │ Link resolution · Resilient file I/O · DB schema constants              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Layer 1: Core Infrastructure

[`@lexbuild/core`](packages/core/) provides format-agnostic building blocks shared by all source packages:

- **XML Parser** — Streaming SAX parser (via `saxes`) that keeps memory bounded even for 100MB+ XML files
- **AST Types** — Typed node hierarchy: levels, content, inline, notes, tables, TOC
- **Markdown Renderer** — AST to Markdown conversion with configurable heading offsets, link styles, and note filtering
- **Frontmatter Generator** — Ordered YAML frontmatter from structured metadata
- **Link Resolver** — Cross-reference resolution with relative paths, canonical URLs, or plaintext fallbacks
- **Resilient File I/O** — `writeFile`/`mkdir` wrappers with exponential backoff on file descriptor exhaustion
- **DB Schema** — Shared SQLite schema definitions used by both CLI (write) and API (read)

## Layer 2: Source Packages

Each source package handles one XML format's complete pipeline: download, parse, build AST, and convert to Markdown. Source packages depend only on core, never on each other. ESLint `no-restricted-imports` rules enforce this boundary.

| Package | Source | XML Format | Download Sources |
|---------|--------|------------|-----------------|
| [`@lexbuild/usc`](packages/usc/) | U.S. Code | USLM 1.0 | OLRC bulk zip |
| [`@lexbuild/ecfr`](packages/ecfr/) | Code of Federal Regulations | eCFR GPO/SGML | eCFR API, govinfo bulk |
| [`@lexbuild/fr`](packages/fr/) | Federal Register | FR GPO/SGML + JSON | FederalRegister.gov API, govinfo bulk |

Each source package provides:

- **Downloader** — Fetches source data from official APIs or bulk endpoints
- **AST Builder** — SAX event handler that constructs typed AST nodes from the source's XML schema
- **Converter** — Orchestrates the pipeline: discover files, parse XML, build AST, render Markdown, write output

`@lexbuild/fr` additionally provides an **enricher** that patches YAML frontmatter in existing `.md` files with metadata from the FederalRegister.gov API, without re-parsing XML or re-rendering Markdown.

## Layer 3: Applications

### CLI (`@lexbuild/cli`)

[`@lexbuild/cli`](packages/cli/) is the published npm binary (`lexbuild`). It is a thin orchestration layer that delegates to source packages for downloading and converting, and handles database ingestion for the API.

Commands follow a `{action}-{source}` pattern:

| Command | Description |
|---------|-------------|
| `download-usc`, `download-ecfr`, `download-fr` | Fetch source XML from official endpoints |
| `convert-usc`, `convert-ecfr`, `convert-fr` | Convert XML to structured Markdown |
| `enrich-fr` | Patch FR frontmatter with API metadata |
| `ingest` | Build SQLite database from Markdown output |
| `api-key` | Manage API keys (create, list, revoke, update) |
| `list-release-points` | List available USC release points |

### Web App (`apps/astro/`)

[`apps/astro/`](apps/astro/) is the public website at [lexbuild.dev](https://lexbuild.dev). It is an Astro 6 SSR application that serves legal content as browsable pages with search.

- **No code dependency on any `@lexbuild/*` package.** It reads `.md` files from the filesystem, making it fully decoupled from the conversion pipeline.
- React 19 islands for interactive UI (sidebar, search, content viewer)
- Full-text search across all sources
- Content is gitignored — generated by the CLI, deployed separately

### Data API (`apps/api/`)

[`apps/api/`](apps/api/) is the REST API at [lexbuild.dev/api](https://lexbuild.dev/api/docs). It is a Hono-based API that serves legal content programmatically from a SQLite database.

- **Depends on `@lexbuild/core`** for shared schema types, but not on any source package.
- The content database is built by the CLI's `ingest` command — the API is read-only against it.
- Content negotiation: JSON (default), raw Markdown, or stripped plaintext
- Full-text search with faceted filtering
- API key authentication with rate limiting
- OpenAPI 3.1 spec with interactive documentation

## How the Layers Connect

The three layers interact through well-defined boundaries:

```
                    DEVELOPMENT TIME                          RUNTIME
                    (code imports)                        (data flow)

                    @lexbuild/cli                         CLI output
                    ┌─────┬─────┐                    ┌──────┬──────┐
                    │     │     │                     │      │      │
                    ▼     ▼     ▼                     ▼      │      ▼
                  usc   ecfr   fr                   .md      │   SQLite
                    │     │     │                  files      │     DB
                    └──┬──┘     │                     │      │      │
                       │       ─┘                     │      │      │
                       ▼                              ▼      │      ▼
                     core                            Web     │    Data
                                                     app     │     API
                                                             │
                                                             ▼
                                                        Search index
                                                      (shared by both)
```

1. **Source packages import core** — they use its SAX parser, AST types, renderer, and file I/O utilities.
2. **CLI imports source packages** — it delegates download/convert commands to the appropriate source package.
3. **CLI produces output consumed by apps** — `.md` files for the web app, SQLite database for the API. This is a data boundary, not a code dependency.
4. **Apps depend on core minimally or not at all** — the API imports `@lexbuild/core` for shared schema types. The web app has zero package dependencies.
5. **Search is shared** — both the web app and the API query the same search index for full-text search.

## Conversion Pipeline

The core pipeline is the same for every source:

```
Source XML → SAX events → Source-specific AST Builder → Typed AST nodes
  → Core Markdown Renderer → YAML frontmatter + Markdown body → .md file
```

1. **Download** — Fetch XML (and optionally JSON metadata) from official sources
2. **Parse** — Stream XML through the SAX parser, emitting events to a source-specific AST builder
3. **Build AST** — The builder maintains a stack of frames, constructing typed nodes. When a complete unit (section, document) closes, it emits the subtree via callback and releases memory.
4. **Render** — The core renderer walks the AST and produces Markdown with YAML frontmatter. Link resolution, note filtering, and heading offsets are applied at this stage.
5. **Write** — Output files are written to a date-based (FR) or hierarchy-based (USC, eCFR) directory structure with `_meta.json` sidecar indexes.

## Dependency Graph

```
@lexbuild/cli
  ├── @lexbuild/usc  → @lexbuild/core
  ├── @lexbuild/ecfr → @lexbuild/core
  └── @lexbuild/fr   → @lexbuild/core

apps/api  → @lexbuild/core (shared schema types only)
apps/astro (no package dependencies — consumes output files only)
```

Source packages are independent — they never import from each other. Adding a new source means creating a new `@lexbuild/<source>` package that depends only on core.

## Adding New Sources

The multi-source architecture is proven by three independent implementations with completely different XML schemas. Adding a new source follows the established pattern:

1. Create `packages/<source>/` with a dependency on `@lexbuild/core`
2. Implement a SAX-based AST builder for the source's XML schema
3. Implement download and convert functions
4. Add CLI commands (`download-<source>`, `convert-<source>`)
5. Register the package in changesets and ESLint boundary rules

New sources automatically work with the existing apps — once the CLI produces `.md` output and the database is rebuilt with `ingest`, both the web app and the API serve the new content without code changes.

## Further Reading

- [`docs/architecture/`](docs/architecture/) — Detailed architecture documentation
- [`docs/packages/`](docs/packages/) — Per-package documentation
- [`docs/apps/`](docs/apps/) — Application documentation
- [`docs/reference/cli-reference.md`](docs/reference/cli-reference.md) — Complete CLI reference
