# ADR-0003: Section as the Atomic Output Unit

**Status:** Accepted
**Date:** 2024-12-01

## Context

LexBuild needs a consistent unit of output — a chunk size that determines how the
converted U.S. Code is split into files. The choice of granularity directly affects
downstream RAG pipeline performance, embedding quality, legal citation accuracy,
and the overall utility of the converted corpus.

The U.S. Code has a deep hierarchical structure: title, subtitle, chapter,
subchapter, part, section, subsection, paragraph, subparagraph, clause, subclause,
item, subitem, and subsubitem. Within this hierarchy, the **section** holds a
unique legal position. It is the smallest independently citable unit in American
statutory law — legal citations reference sections (e.g., "42 U.S.C. 1983"), not
subsections or paragraphs. A section is self-contained: it has a unique identifier,
a number, a heading, substantive text, source credits, and associated notes.

Three granularity levels were evaluated for the default output mode:

1. **Paragraph-level** — one file per `<subsection>` or `<paragraph>`. This would
   create extremely small files (often a single sentence or clause), losing the
   legal context that makes a section meaningful. A subsection like "(a)" is not
   independently citable and makes little sense without its parent section. This
   would also produce hundreds of thousands of files across the corpus.

2. **Chapter-level** — one file per `<chapter>`. This keeps related sections
   together, but some chapters in Title 42 contain over 500 sections and would
   produce files exceeding 50,000 tokens — far beyond typical embedding model
   context windows (512 to 8,192 tokens). Retrieval precision would suffer because
   a query matching one section would return the entire chapter.

3. **Section-level** — one file per `<section>`. Maps one-to-one with legal
   citation, produces files typically between 500 and 3,000 tokens (fitting
   comfortably within common embedding windows), and yields a manageable corpus
   of approximately 60,000 files across all 54 titles.

## Decision

The section is the atomic output unit. In the default granularity mode, each
`<section>` element in the XML produces one Markdown file with its own YAML
frontmatter. All subordinate elements — subsections, paragraphs, subparagraphs,
clauses, and below — are rendered inline within the section file.

Subordinate levels use bold inline numbering — `**(a)**`, `**(1)**`, `**(A)**`,
`**(i)**` — rather than Markdown headings. This preserves a flat document structure
within each file, which is better suited for embedding models and chunking
strategies than deeply nested heading hierarchies. The heading is reserved for the
section itself (`# 1983. Civil action for deprivation of rights`).

Two alternative granularity modes are offered via the `-g` CLI flag:

- **Chapter mode** (`-g chapter`): one Markdown file per chapter, with sections
  rendered as H2 headings within the file. Useful when broader context is needed
  per chunk or when the consumer prefers fewer, larger files.
- **Title mode** (`-g title`): one Markdown file per title, with the entire
  hierarchy rendered using recursive headings (H1 for title, H2 for chapters,
  H3 for sections, etc., capped at H6). Useful for full-text analysis or
  producing a single document per title.

The `ASTBuilder.emitAt` property controls which level triggers the emit callback.
At section granularity, each completed section AST is emitted and released from
memory. At chapter or title granularity, the builder accumulates more of the tree
before emitting.

## Consequences

### Positive

- Direct mapping to legal citation conventions. A file path like
  `title-42/chapter-21/section-1983.md` corresponds exactly to "42 U.S.C. 1983".
  This makes the output intuitive for legal researchers and predictable for
  programmatic access patterns.
- Token sizes fit typical RAG embedding windows. Most sections fall between 500
  and 3,000 tokens, aligning well with common embedding model context limits.
- Each file is self-contained with YAML frontmatter (identifier, title, chapter,
  section number, status, source credit). A RAG pipeline can ingest individual
  files without needing directory context or sidecar metadata.
- The ~60,000 file count enables precise retrieval — a vector search returns the
  exact section relevant to a query, not an entire chapter.
- Memory efficiency at section granularity: only one section's AST is in memory
  at any time, enabling processing of 100MB+ XML files within a 10MB envelope.

### Negative

- 60,000+ files is a large number for file system operations. Listing, copying,
  or archiving the full corpus requires tools that handle large directory trees.
- The `title-NN/chapter-NN/` directory hierarchy is required to keep the per-
  directory file count manageable. A flat directory with 60,000 files would be
  unusable in file browsers and slow to enumerate.
- Cross-references between sections require link resolution. A section referencing
  another section in the same title or a different title needs its `<ref>` elements
  resolved to relative file paths or fallback OLRC URLs. This adds a link resolver
  component to the rendering pipeline.
- Legal context sometimes spans multiple sections. A definition in one section
  referenced by many others is not captured within those other sections' files.
  Consumers must implement cross-reference tracking or retrieval strategies that
  pull in related sections.
- Duplicate section numbers within a chapter (which occur in several titles)
  require disambiguation with `-2`, `-3` suffixes in the filename, adding a
  special case to the output path logic.

### Neutral

- The `_meta.json` sidecar files at each directory level provide an index of
  contained sections with token estimates, enabling consumers to plan retrieval
  strategies without scanning the file tree or opening individual files.
- Appendix titles (5, 11, 18, 28) output to separate directories (e.g.,
  `title-05-appendix/`) to keep appendix content distinct from main title content.
- The three granularity modes give users flexibility. The default (section) is
  optimized for RAG; chapter and title modes serve full-text analysis, human
  reading, and other workflows without requiring separate tooling.

## Related

- [Output format reference](../reference/output-format.md) — directory layout, frontmatter schema, `_meta.json` structure
- [Architecture: AST builder](../old/architecture.md#ast-builder-srcastbuilderts) — section-emit pattern and `emitAt` configuration
- [Architecture: data flow](../old/architecture.md#data-flow-section-level-conversion) — end-to-end conversion pipeline
