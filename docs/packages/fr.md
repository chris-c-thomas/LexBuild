# @lexbuild/fr

Federal Register source package for LexBuild. Converts Federal Register XML (GPO/SGML-derived format from the FederalRegister.gov API) into structured Markdown. This package includes its own AST builder (`FrASTBuilder`) because the FR XML format is document-centric and flat, unlike the hierarchical structures of USLM or eCFR.

The package depends on `@lexbuild/core` for the XML parser, AST types, Markdown renderer, frontmatter generator, link resolver, and resilient file I/O. It does not depend on `@lexbuild/usc` or `@lexbuild/ecfr` -- source packages are independent by design.

## Module Map

```
packages/fr/src/
  index.ts                 # Barrel exports
  converter.ts             # Conversion orchestrator
  converter.test.ts        # 6 integration tests
  fr-builder.ts            # FR SAX --> AST state machine
  fr-builder.test.ts       # 16 unit tests
  fr-elements.ts           # FR XML element classification (~92 elements) + FrDocumentType
  fr-frontmatter.ts        # Build FrontmatterData from FR context + API JSON
  fr-frontmatter.test.ts   # 27 unit tests
  fr-path.ts               # Date-based output path builder
  fr-path.test.ts          # 8 unit tests
  downloader.ts            # FederalRegister.gov API client
  govinfo-downloader.ts    # Govinfo bulk XML downloader (daily-issue XML for historical backfill)
```

## Public API

| Export | Type | Purpose |
|--------|------|---------|
| `convertFrDocuments(options)` | Function | Convert FR XML files to Markdown |
| `downloadFrDocuments(options)` | Function | Download FR documents by date range |
| `downloadSingleFrDocument(number, output)` | Function | Download a single document by number |
| `buildFrApiListUrl(from, to, page, types?)` | Function | Build API listing URL |
| `buildFrFrontmatter(node, ctx, xmlMeta, jsonMeta?)` | Function | Build frontmatter from AST + metadata |
| `buildFrOutputPath(number, date, root)` | Function | Build output file path |
| `buildFrDownloadXmlPath(number, date, root)` | Function | Build download XML file path |
| `buildFrDownloadJsonPath(number, date, root)` | Function | Build download JSON file path |
| `FrASTBuilder` | Class | SAX-to-AST builder for FR GPO/SGML XML |
| `downloadFrBulk(options)` | Function | Download daily-issue XML from govinfo for a date range |
| `buildGovinfoFrUrl(date)` | Function | Build govinfo download URL for a single day |
| `buildGovinfoBulkPath(date, output)` | Function | Build local file path for a downloaded daily-issue XML |

Key type exports: `FrConvertOptions`, `FrConvertResult`, `FrConvertProgress`, `FrDownloadOptions`, `FrDownloadResult`, `FrDownloadedFile`, `FrDownloadFailure`, `FrDownloadProgress`, `FrGovinfoBulkOptions`, `FrGovinfoResult`, `FrGovinfoDownloadedFile`, `FrGovinfoProgress`, `FrASTBuilderOptions`, `FrDocumentXmlMeta`, `FrDocumentJsonMeta`, `FrDocumentType`.

## Key Design Differences from Other Sources

The Federal Register is fundamentally different from the U.S. Code and eCFR:

1. **Document-centric, not hierarchical.** Each FR document (rule, notice, proposed rule, presidential document) is self-contained with a preamble, body, and signature. There is no title/chapter/section hierarchy within documents.

2. **Temporal corpus.** The FR is an ever-growing historical record, not a current-state snapshot like the U.S. Code or CFR. Output is organized by date (`output/fr/{YYYY}/{MM}/`) rather than by title.

3. **Dual ingestion.** The FederalRegister.gov API provides both structured JSON metadata (40+ fields including agencies, CFR references, docket IDs, effective dates) and XML full text per document. The converter reads both to produce enriched Markdown with comprehensive frontmatter.

4. **No granularity options.** FR documents are already atomic -- one file per document. No `--granularity` flag is needed.

5. **Date-based download.** Uses `--from`/`--to` date range flags instead of `--titles`/`--all`.

## AST Builder Architecture

The `FrASTBuilder` uses the same stack-based SAX pattern as `EcfrASTBuilder` but adapted for FR's flat structure:

- Each document element (`RULE`, `NOTICE`, `PRORULE`, `PRESDOCU`) pushes a `"document"` frame and emits a single `LevelNode(levelType: "section")` when closed.
- Preamble metadata (`AGENCY`, `SUBAGY`, `CFR`, `SUBJECT`, `RIN`) is extracted into `FrDocumentXmlMeta` during parsing.
- Preamble sections (`AGY`, `ACT`, `SUM`, `DATES`, `ADD`, `FURINF`) render as bold-labeled content nodes.
- `SUPLINF` content (headings, paragraphs) becomes the document body.
- `REGTEXT` blocks render as labeled content with amendment instructions.
- `SIG` blocks render as signature note nodes.
- `FRDOC` text is parsed to extract the document number (e.g., `[FR Doc. 2026-06029 ...]` --> `2026-06029`).
- GPOTABLE elements (`BOXHD`/`CHED`/`ROW`/`ENT`) are collected into `TableNode` objects.

### Emphasis Map Differences from eCFR

`FR_EMPHASIS_MAP` in `fr-elements.ts` is an independent copy of `ECFR_EMPHASIS_MAP` -- package boundary rules (`no-restricted-imports`) prevent `@lexbuild/fr` from importing eCFR constants.

Key divergence: `E T="03"` maps to **italic** in FR but **bold** in eCFR. In eCFR, `T="03"` represents "bold italic in print" and renders as bold for emphasis. In FR, `T="03"` marks legal citations, case names, and publication titles, which are conventionally italicized. This is an intentional difference, not a sync error.

All other shared codes (`01`=bold, `02`=italic, `04`=italic, `05`=italic, `51`/`52`/`54`=sub, `7462`=italic) produce the same output in both maps. When adding new emphasis codes, update both maps and document whether the new code should diverge.

### Publication Date Inference

The `closeFrdoc()` method parses the `FRDOC` element text to extract a publication date. The FR publishes the morning after filing, so the method adds 1 calendar day to the filing date.

Parsing flow:
1. Match `Filed M-D-YY` from FRDOC text (e.g., `"[FR Doc. 2026-06029 Filed 3-27-26; 8:45 am]"`)
2. Convert 2-digit year: 00--49 maps to 2000s, 50--99 maps to 1900s
3. Validate month/day -- `Date` constructor silently wraps invalid values (e.g., month 13 becomes January of the next year), so the method checks `filed.getMonth() !== mm - 1 || filed.getDate() !== dd` and rejects invalid dates
4. Add 1 day and store as `publicationDate` on `FrDocumentXmlMeta`

Two fallback chains use publication dates independently:

**Output path construction** (converter): JSON sidecar `publication_date` (if JSON matches document number) --> path-inferred date via `inferDateFromPath()` (govinfo bulk paths yield exact `YYYY-MM-DD`; per-document paths yield `YYYY-MM-01`) --> empty string (produces `0000/00/` output directory with a console warning).

**Frontmatter** (`buildFrFrontmatter`): `jsonMeta.publication_date` --> `xmlMeta.publicationDate` (from `closeFrdoc()` parsing) --> empty string.

### Whitespace Normalization

FR XML from the API includes generous indentation inside `<P>` elements and other content. The builder normalizes whitespace during `onText` processing:

- Content frames: `text.replace(/\s+/g, " ")` collapses runs of whitespace (including newlines and indentation) to single spaces
- Inline frames: same normalization applied to text within `<E>`, `<I>`, `<B>`, and other inline elements
- Whitespace-only text nodes (`normalized === " "`) are filtered out to prevent blank inline nodes

This normalization is applied only within content and inline frames. Metadata frames (preamble meta, FRDOC) use `.trim()` without internal whitespace collapse, preserving the original text structure.

## Download Architecture

The downloader queries the FederalRegister.gov API (`/documents.json`) with date range and optional type filters. Key behaviors:

- **Month chunking.** The API caps results at 10,000 per query. The downloader automatically breaks large date ranges into month-sized chunks to stay under this limit.
- **Dual file output.** Each document produces both a `.json` metadata sidecar and a `.xml` full text file in the download directory.
- **Retry with backoff.** Transient errors (429, 503, 504) are retried with exponential backoff.
- **Pre-2000 handling.** Documents before January 2000 have JSON metadata but no XML full text. These are skipped during download with a count reported in the result.

### Govinfo Bulk Downloader

The govinfo bulk downloader (`govinfo-downloader.ts`) fetches complete daily-issue XML files for historical backfill. Each file contains all FR documents published on a single day (~150 documents, ~2.4 MB average).

URL pattern:

```
https://www.govinfo.gov/content/pkg/FR-{YYYY-MM-DD}/xml/FR-{YYYY-MM-DD}.xml
```

Key behaviors:

- **Concurrent worker pool.** Configurable concurrency (default 10) using a shared index counter with N async workers. Safe across `await` boundaries because JS is single-threaded.
- **Retry with exponential backoff.** Transient HTTP errors (429, 503, 504) and network errors are retried up to 2 times with exponential backoff (2s base). Respects `Retry-After` headers when present.
- **Weekend/holiday skipping.** 404 responses (no issue published) are counted as skipped, not failures.
- **Streaming writes.** Uses `node:stream/promises` pipeline to write response bodies directly to disk without buffering entire files in memory.
- **Output path.** Files are stored as `{output}/bulk/{YYYY}/FR-{YYYY-MM-DD}.xml`.

The `FrASTBuilder` handles daily-issue XML natively -- the `FEDREG` root and section containers (`RULES`, `NOTICES`, `PRORULES`, `PRESDOCS`) are all classified as passthroughs, so individual document elements emit via `onEmit` without needing a splitter.

Use the per-document API downloader for incremental updates (recent documents, pre-publication access, JSON metadata sidecars). Use govinfo bulk for historical backfill where throughput matters more than metadata richness.

## Frontmatter Fields

FR documents produce these fields in addition to standard LexBuild frontmatter:

| Field | Source | Description |
|-------|--------|-------------|
| `document_number` | XML/JSON | FR document number (e.g., `"2026-06029"`) |
| `document_type` | XML/JSON | `rule`, `proposed_rule`, `notice`, `presidential_document` |
| `fr_citation` | JSON | Full citation (e.g., `"91 FR 15619"`) |
| `fr_volume` | JSON | Volume number |
| `publication_date` | JSON | Publication date (YYYY-MM-DD) |
| `agencies` | XML/JSON | List of agency names |
| `cfr_references` | XML/JSON | Affected CFR titles/parts |
| `docket_ids` | JSON | Docket identifiers |
| `rin` | XML/JSON | Regulation Identifier Number |
| `effective_date` | JSON | When the rule takes effect |
| `comments_close_date` | JSON | Comment period end date |
| `fr_action` | JSON | Action description (e.g., `"Final rule."`) |

Standard fields use FR-specific conventions: `title_number: 0`, `title_name: "Federal Register"`, `section_number` = document number, `positive_law: false`, `legal_status: "authoritative_unofficial"`.

## Output Structure

```
output/fr/
  2026/
    01/
      2026-00123.md
    03/
      2026-06029.md
      2026-06048.md
```

### ConvertOptions

```typescript
interface FrConvertOptions {
  input: string;                    // Path to .xml file or directory containing YYYY/MM/*.xml
  output: string;                   // Output root directory
  linkStyle: "relative" | "canonical" | "plaintext";
  dryRun: boolean;                  // Parse only, don't write files
  from?: string;                    // Filter: start date (YYYY-MM-DD)
  to?: string;                      // Filter: end date (YYYY-MM-DD)
  types?: FrDocumentType[];         // Filter: document types (RULE, NOTICE, etc.)
  onProgress?: (progress: FrConvertProgress) => void;
}
```

Notable absences compared to eCFR's `EcfrConvertOptions`: no `granularity` (FR documents are already atomic), no `--titles`/`--all` (date-based corpus), no `includeNotes`/`includeEditorialNotes`/`includeStatutoryNotes`/`includeAmendments` (FR documents don't have the same note taxonomy as statutory/regulatory text). The `types` filter replaces title-based selection, allowing conversion of only rules, notices, or other document subsets.

## Data Source

| Field | Detail |
|-------|--------|
| API | `federalregister.gov/api/v1/` |
| Authentication | None required |
| Rate limits | No documented limits |
| Coverage | JSON from 1994, XML from 2000 |
| Update cadence | Daily (business days) |
| Volume | ~28,000--31,000 documents/year |
| Legal status | Unofficial -- only authenticated PDF has legal standing |

## Dependencies

Imports from `@lexbuild/core`: `XMLParser`, `LevelNode`, `EmitContext`, `ContentNode`, `InlineNode`, `NoteNode`, `TableNode`, `renderDocument`, `createLinkResolver`, `writeFile`, `mkdir`.

Does not import from `@lexbuild/usc` or `@lexbuild/ecfr`. Element classification (emphasis maps, inline elements) is duplicated per package boundary rules enforced by ESLint `no-restricted-imports`.
