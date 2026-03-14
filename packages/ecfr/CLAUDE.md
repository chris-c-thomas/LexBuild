# CLAUDE.md — @lexbuild/ecfr

## Package Overview

`@lexbuild/ecfr` converts Electronic Code of Federal Regulations (eCFR) bulk XML to structured Markdown. It depends on `@lexbuild/core` for XML parsing, AST types, and Markdown rendering. The eCFR uses GPO/SGML-derived XML — a completely different format from USLM 1.0 used by the U.S. Code.

## Module Structure

```
src/
├── index.ts                 # Barrel exports
├── ecfr-elements.ts         # GPO/SGML element classification (DIV types, emphasis codes)
├── ecfr-builder.ts          # SAX → AST state machine for eCFR XML
├── ecfr-builder.test.ts     # 12 unit tests
├── ecfr-frontmatter.ts      # Build FrontmatterData from eCFR context
├── ecfr-path.ts             # Output path builder
├── converter.ts             # Conversion orchestrator (collect-then-write)
└── downloader.ts            # Download eCFR XML from govinfo
```

## Public API

| Export | Type | Purpose |
|--------|------|---------|
| `convertEcfrTitle()` | Function | Convert an eCFR XML file to Markdown |
| `downloadEcfrTitles()` | Function | Download eCFR XML from govinfo bulk data |
| `buildEcfrDownloadUrl()` | Function | Build download URL for a single title |
| `EcfrASTBuilder` | Class | SAX→AST builder for GPO/SGML XML |
| `ECFR_TITLE_COUNT` | Constant | `50` |
| `ECFR_TITLE_NUMBERS` | Constant | Array `[1, 2, ..., 50]` |
| Element classification sets | Constants | `ECFR_TYPE_TO_LEVEL`, `ECFR_DIV_ELEMENTS`, etc. |

## eCFR XML Schema

See `ECFR-XML-SCHEMA.md` in this package for the full schema reference. Key differences from USLM:

- **No namespace** — all elements in empty namespace
- **DIV1-DIV9** with `TYPE` attribute determines level (not semantic element names)
- **Flat subsections** — `<P>` elements with numbering prefixes, not nested elements
- **HTML-style tables** — `TABLE/TR/TH/TD`, not GPOTABLE or XHTML namespace
- **No Dublin Core metadata** — minimal metadata in `HEADER`

## DIV→LevelType Mapping

| DIV | TYPE | LevelType |
|-----|------|-----------|
| DIV1 | TITLE | title |
| DIV3 | CHAPTER | chapter |
| DIV4 | SUBCHAP | subchapter |
| DIV5 | PART | part |
| DIV6 | SUBPART | subpart |
| DIV7 | SUBJGRP | subpart |
| DIV8 | SECTION | section |
| DIV9 | APPENDIX | appendix |

## Conversion Pipeline

```
eCFR XML → [XMLParser(defaultNamespace: "")] → SAX events
  → [EcfrASTBuilder] → collected sections/parts
  → [Two-pass link registration] (section granularity)
  → [renderDocument()] → Markdown + YAML frontmatter
  → Write phase: .md files, _meta.json, README.md
```

## ConvertOptions

```typescript
{
  input: string;
  output: string;
  granularity: "section" | "part" | "title";
  linkStyle: "relative" | "canonical" | "plaintext";
  includeSourceCredits: boolean;
  includeNotes: boolean;
  includeEditorialNotes: boolean;
  includeStatutoryNotes: boolean;
  includeAmendments: boolean;
  dryRun: boolean;
}
```

## Output Structure

```
output/ecfr/
├── title-01/
│   ├── chapter-I/
│   │   ├── part-1/
│   │   │   ├── section-1.1.md
│   │   │   └── _meta.json
│   │   └── part-2/
│   │       ├── section-2.1.md
│   │       ├── section-2.2.md
│   │       └── _meta.json
│   ├── _meta.json
│   └── README.md
└── title-17/
    └── ...
```

## Download URLs

```
https://www.govinfo.gov/bulkdata/ECFR/title-{N}/ECFR-title{N}.xml
```

Individual XML files per title (not ZIP archives). 50 titles total.

## Frontmatter Fields

eCFR sections include all standard fields plus:
- `source: "ecfr"`
- `legal_status: "authoritative_unofficial"`
- `authority` — regulatory authority citation (from part-level AUTH)
- `regulatory_source` — publication source (from part-level SOURCE)
- `cfr_part` — CFR part number
- `positive_law: false` (regulations, not legislation)

## Dependency on @lexbuild/core

Imports: `XMLParser`, `LevelNode`, `EmitContext`, `FrontmatterData`, `renderDocument`, `generateFrontmatter`, `createLinkResolver`, `BIG_LEVELS`, `LEVEL_TYPES`, `FORMAT_VERSION`, `GENERATOR`.

Does NOT import from `@lexbuild/usc`. Source packages are independent.
