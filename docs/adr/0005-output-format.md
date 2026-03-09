# ADR-0005: Markdown with YAML Frontmatter and JSON Sidecars

**Status:** Accepted
**Date:** 2024-12-01

## Context

LexBuild's output must serve multiple consumers with different needs: RAG pipelines
that ingest individual documents with metadata for filtering, embedding systems that
need clean text within token budgets, search indexes that need structured fields,
downstream applications (like the web app) that need navigational metadata, and
human readers who want to inspect output directly. The format must accommodate all
of these without requiring separate output modes for each consumer type.

Three output formats were considered. **JSON** is machine-friendly and self-
describing, but JSON files containing legal text are difficult to read by hand and
most embedding pipelines expect plain text or Markdown, requiring an extraction
step. **Plain text** is universally readable but provides no mechanism for
structured metadata — title number, section identifier, status, and other fields
would need to be encoded in filenames or parsed from text conventions. **Markdown**
occupies a middle ground: human-readable plain text with lightweight formatting,
universally supported by text editors, documentation platforms, and LLM APIs, with
structured metadata via YAML frontmatter.

A secondary question is directory-level metadata. Consumers that need to enumerate
sections, estimate token counts, or build navigation trees should not have to parse
every individual file. A sidecar index file solves this. The output format also
needs independent versioning so consumers can detect schema changes regardless of
which software version produced the output.

## Decision

LexBuild produces Markdown files with YAML frontmatter for per-file metadata, plus
`_meta.json` sidecar files for directory-level indexes. The output schema is
versioned independently via a `FORMAT_VERSION` constant (currently `"1.0.0"`) that
appears in both frontmatter (`format_version` field) and sidecar files.

Each Markdown file contains:

- **YAML frontmatter** with structured fields: `identifier` (canonical USLM URI
  like `/us/usc/t1/s7`), `title_number`, `title_name`, `section_number`,
  `section_name`, `chapter_number`, `chapter_name`, `positive_law` status,
  `source_credit`, `currency` (OLRC release point), `last_updated`, `status` (for
  repealed or transferred sections), `format_version`, and `generator`.
- **Statutory text** rendered as Markdown with bold inline numbering for subsections
  and below (`**(a)**`, `**(1)**`, `**(A)**`), horizontal rules separating content
  sections, and Markdown footnotes (`[^N]`) for inline notes.
- **Source credits** rendered after a horizontal rule when included.
- **Notes** (editorial, statutory, amendment history) rendered as blockquotes with
  topic headings when included via CLI flags. Notes are opt-in — the default output
  includes only statutory text and source credits.

Each directory (at both title and chapter level) contains a `_meta.json` file with:

- Format version, identifier, and title metadata.
- Aggregate statistics: chapter count, section count, total estimated tokens.
- A structured listing of all chapters and sections with per-section token
  estimates (using a character/4 heuristic), file paths, note indicators, and
  status values.

Title-granularity output is the exception: since there are no subdirectories, all
metadata is embedded in enriched frontmatter fields (`chapter_count`,
`section_count`, `total_token_estimate`) rather than sidecar files.

## Consequences

### Positive

- Universal compatibility. Every text editor, static site generator, documentation
  platform, and LLM API accepts Markdown. No specialized parser or SDK required.
- YAML frontmatter enables metadata-based filtering in RAG pipelines — retrieve
  only sections from Title 26, or only sections with status `"current"` — without
  parsing the body text.
- JSON sidecar files enable index-based retrieval. A consumer reads one `_meta.json`
  to enumerate all sections in a chapter with token estimates, enabling retrieval
  planning without opening individual files.
- Human readability is preserved. A developer or legal researcher can open any file
  in a text editor and immediately understand its content.
- Independent format versioning (`FORMAT_VERSION`) decouples the output schema from
  the software release cycle.
- Token estimates in `_meta.json` use a simple character/4 heuristic, letting
  consumers plan retrieval strategies without a tokenizer dependency.

### Negative

- Markdown's table support is limited. Pipe tables cannot represent merged cells or
  column spans. Some U.S. Code tables (particularly in Title 26) require HTML
  fallback, breaking the "pure Markdown" property for affected sections.
- YAML frontmatter adds a parsing step for consumers. A consumer that only needs
  body text must handle or skip the `---`-delimited frontmatter block.
- The dual-format approach (Markdown + JSON sidecars) means two artifacts per
  directory. Consumers that modify output files must keep sidecars in sync.
- Bold inline numbering (`**(a)**`) embeds structural information in formatting
  rather than in Markdown's heading hierarchy, so consumers cannot use heading-based
  splitting to identify subsection boundaries.

### Neutral

- The `generator` field in frontmatter (e.g., `"lexbuild@1.4.2"`) provides
  provenance tracking. Consumers can identify which software version produced a
  given file, useful for debugging and reproducibility.
- Notes are opt-in via CLI flags (`--include-editorial-notes`,
  `--include-statutory-notes`, `--include-amendments`). The default output is lean
  — statutory text and source credits only. Consumers who need editorial or
  amendment context re-convert with the appropriate flags.
- Cross-references are rendered as relative Markdown links when the target section
  has been converted, or as plain text citations when it hasn't. This provides
  navigability within the corpus without broken links to unconverted content.

## Related

- [Output format reference](../reference/output-format.md) — complete specification of directory layout, frontmatter schema, and `_meta.json` structure
- [Architecture: frontmatter generator](../old/architecture.md#frontmatter-generator-srcmarkdownfrontmatterts) — frontmatter field definitions and `FORMAT_VERSION`
- [Architecture: Markdown renderer](../old/architecture.md#markdown-renderer-srcmarkdownrendererts) — rendering rules and note filtering
