# Phase 2 — Complete

**Date**: 2026-02-28
**Branch**: `dev`
**Status**: All Phase 2 exit criteria met

---

## Summary

Phase 2 delivered content fidelity features: whitespace normalization, cross-reference link resolution, XHTML and USLM layout table conversion, notes filtering with CLI flags, `_meta.json` sidecar index generation, and chapter-level granularity mode. E2E verified against Title 1 (39 sections) and Title 5 (1162 sections, 63 chapters) with zero errors.

## Test Coverage

| Package | Tests | Files |
|---------|-------|-------|
| `@law2md/core` | 90 | 8 test files |
| `@law2md/usc` | 10 | 2 test files |
| `law2md` (CLI) | 3 | 1 test file |
| **Total** | **103** | **11 test files** |

All 12 turbo tasks (build/test/lint/typecheck x 3 packages) pass cleanly.

## What Was Built

### Task 18: Fix extra blank lines
- Builder: skip whitespace-only text events inside content frames; clean paragraph separators in `<p>` close handler
- Renderer: `normalizeWhitespace()` collapses multi-newline runs

### Task 19: Cross-reference link resolver
- `packages/core/src/markdown/links.ts`: `parseIdentifier()`, `createLinkResolver()` with register/resolve/fallbackUrl
- Two-pass approach in converter: parse all sections first, register paths, then render with resolver
- Three link modes: plaintext (default), canonical (OLRC URLs), relative (intra-corpus paths)

### Task 20: XHTML table conversion
- `TableCollector` in builder captures `xhtml:table/thead/tbody/tr/th/td` structure
- Renderer outputs Markdown pipe tables with header row and separator
- Handles column count normalization and pipe escaping

### Task 21: USLM layout table conversion
- `layoutCollector` in builder for `<layout>/<header>/<row>/<tocItem>/<column>` elements
- Produces `TableNode` with `variant: "layout"` rendered by the same table renderer
- `<toc>` container tracked by depth counter to skip non-layout elements inside

### Task 22: Notes filtering
- `NotesFilter` interface: `{ editorial, statutory, amendments }` booleans
- Renderer tracks current category from cross-heading notes, filters by topic
- CLI flags: `--no-include-notes`, `--include-editorial-notes`, `--include-statutory-notes`, `--include-amendments`
- Smart auto-switch: specific flags override default "include all" behavior

### Task 23: `_meta.json` sidecar indexes
- `SectionMeta` collected during conversion: identifier, number, name, file path, content length, has_notes, status
- Title-level `_meta.json`: format_version, generator, stats, chapters with nested section listings
- Chapter-level `_meta.json`: section_count, sections array with token estimates (char/4)

### Task 24: Chapter-level granularity
- `--granularity chapter` CLI option
- Builder emits at chapter level; sections rendered as H2 within chapter files
- Output: `title-NN/chapter-NN.md` instead of `title-NN/chapter-NN/section-N.md`
- **Critical fix**: collector zones (table/layout/toc) moved before normal element handlers to prevent stale stack frames

### Task 25: Title 5 validation
- 1162 sections across 63 chapters in 0.46s
- Tables (HNR), deep subsection nesting, notes, status sections all correct
- 2 known duplicate section numbers (3598, 5757) — genuine USC anomalies, second overwrites first

## Bugs Found and Fixed

1. **Extra blank lines** (Task 18): XML whitespace between `<p>` elements compounded with builder's paragraph separators. Fixed with whitespace filtering and normalization.

2. **Collector zone ordering** (Task 24): Table, layout, and toc collectors were checked AFTER normal element handlers (level, content, inline). This caused `<ref>`, `<note>`, and other elements inside `<toc>/<layout>/<column>` to create stale stack frames. Sections couldn't attach to their parent chapter. Fixed by moving all collector checks before normal handlers.

## Known Limitations (Phase 3 scope)

- **Duplicate section numbers**: 2 sections in Title 5 have the same number — second overwrites first
- **Quoted content link artifacts**: `"(d)` inside quoted content can look like a Markdown link
- **`_meta.json` in chapter mode**: chapter-level meta files still created in subdirectories
- **Download command**: not yet implemented
- **Memory profiling**: not yet done for large titles (26, 42)
- **Appendix title handling**: not yet implemented
- **Concurrent file writes**: single-threaded sequential writes
- **`README.md` generation**: title/chapter README files not yet generated

## Fixture Files Added in Phase 2

| Path | Purpose |
|------|---------|
| `fixtures/fragments/section-with-table.xml` | Section with 3-column XHTML table |
| `fixtures/fragments/section-with-layout.xml` | Section with layout table + chapter TOC |
| `fixtures/fragments/section-with-notes.xml` | Section with editorial + statutory notes for filtering tests |

## Technical Notes

- Token estimation uses `Math.ceil(contentLength / 4)` heuristic (tiktoken deferred to Phase 4)
- Link resolver uses `node:path` relative() for computing relative paths between files
- Notes classification: amendments/effectiveDateOfAmendment/shortTitleOfAmendment → amendments; codification/dispositionOfSections → editorial; changeOfName/regulations/miscellaneous/repeals/separability/crossReferences → statutory
- `tocDepth` counter prevents elements inside `<toc>` from creating AST frames when no layout collector is active
