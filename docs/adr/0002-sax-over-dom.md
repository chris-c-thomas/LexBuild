# ADR-0002: SAX Streaming Parser over DOM

**Status:** Accepted
**Date:** 2024-12-01

## Context

The U.S. Code is published as 54 XML files totaling approximately 650MB. Individual
titles vary enormously in size: Title 1 (General Provisions) is 0.3MB with 39
sections, while Title 42 (Public Health) is 107MB with over 8,460 sections. The
conversion pipeline must parse every element in these files to build an intermediate
AST and render Markdown output.

Two fundamental parsing strategies were evaluated:

**DOM parsing** reads the entire XML file into an in-memory tree, enabling random
access to any element via XPath or tree traversal. This makes code straightforward —
find a section, query its children, traverse siblings. However, DOM parsing of a
107MB XML file would require well over 1GB of heap memory for the tree
representation alone (DOM nodes carry significant per-node overhead beyond the raw
text size). Processing all 54 titles sequentially with DOM would require either
releasing and re-parsing trees between titles or allocating memory for multiple
large trees simultaneously. The largest titles would push against or exceed Node.js's
default heap limit of approximately 1.7GB.

**SAX parsing** processes the document as a stream of events — element open, element
close, text content — without ever holding the full document in memory. Each element
is handled as it appears in the stream, and completed structures can be released
immediately. SAX naturally aligns with a streaming pipeline where parsing, building,
rendering, and writing happen incrementally rather than as discrete phases.

The choice has deep implications for code structure. DOM enables a declarative
"query the tree" pattern that is easier to read and debug — set a breakpoint and
inspect the entire document. SAX requires maintaining explicit state: a stack of
open elements, the current node under construction, flags for tracking context
(e.g., whether we're inside a `<quotedContent>` block). Processing must follow
strict document order with no ability to look ahead or back.

## Decision

We use the `saxes` SAX parser (a modern, spec-compliant fork of `sax-js`) with
stack-based AST construction and a section-emit pattern. The `XMLParser` class in
`@lexbuild/core` wraps `saxes` with namespace normalization — elements in the
default USLM namespace emit bare names like `section`, while elements in other
namespaces emit prefixed names like `xhtml:table`. It supports both `parseString()`
for testing with small fragments and `parseStream()` for production use with file
read streams.

The `ASTBuilder` class maintains a stack of open `LevelNode` objects. As the SAX
parser fires events, the builder pushes new nodes onto the stack (on element open)
and pops them (on element close). When a section's close tag is encountered, the
completed section subtree is emitted via an `onEmit` callback and released from
memory. This means at most one section's AST is held in memory at any time during
section-granularity conversion.

The `emitAt` property on `ASTBuilder` is configurable — set to `"section"`,
`"chapter"`, or `"title"` — controlling at which level the builder emits completed
subtrees. This directly implements the granularity modes without changing the
parsing logic.

## Consequences

### Positive

- Memory usage is bounded and predictable. At section granularity, the worst-case
  memory for any title is under 10MB: ~64KB SAX buffer, ~5KB ancestor stack (about
  1KB per nesting level, typically 5 levels deep), up to ~500KB for the largest
  individual section AST (certain Title 26 sections), ~2KB document metadata, and
  ~64KB file write buffer.
- Can process arbitrarily large XML files. If a future OLRC release produces a
  200MB title, the same code handles it without modification or increased memory.
- Performance is excellent: all 54 titles (~650MB of XML, 60,215 sections) convert
  in approximately 18 seconds. Title 42 (107MB, 8,460 sections) completes in 2.7
  seconds. Title 26 (53MB, 2,160 sections) completes in 1.1 seconds.
- The streaming architecture naturally supports the collect-then-write pattern used
  in `@lexbuild/usc`, where section metadata is accumulated during parsing and
  sidecar files (`_meta.json`, `README.md`) are written after the stream completes.

### Negative

- Code complexity is significantly higher than DOM. The `ASTBuilder` must track
  `quotedContentDepth` (sections inside quoted bills must not emit as standalone
  files), handle interleaved `<continuation>` elements that appear between same-level
  children, manage footnote numbering state, and process `<notes>` containers with
  cross-heading dividers — all through event callbacks rather than tree queries.
- No random access to elements. If the renderer needs information from a sibling or
  ancestor that wasn't captured during the build phase, the builder must be
  restructured to capture that context proactively. DOM would allow querying for
  it after the fact.
- Debugging is harder. A DOM tree can be inspected at any breakpoint. With SAX,
  the "state" is spread across the builder's stack, the node under construction,
  and the implicit position in the event stream.
- Title-granularity mode is the exception to bounded memory — it holds the entire
  title's AST and rendered Markdown in memory. For Title 42, this requires
  approximately 661MB RSS. This is an accepted trade-off since title mode is opt-in.
- Forward cross-references within a single title (a section referencing a later
  section in the same file) cannot be resolved in a single pass. The link resolver
  uses a registration pattern to handle this, but some references remain unresolved
  until the full title has been processed.

### Neutral

- The `saxes` library is fully XML-namespace-aware, which is critical for correctly
  distinguishing USLM elements from XHTML `<table>` elements that share the same
  local name but live in different namespaces.
- The stack-based builder pattern is a well-known technique for SAX processing.
  While more verbose than DOM traversal, the pattern is consistent, testable, and
  well-documented in the codebase.
- SAX parsing aligns with Node.js's streaming I/O model. The XML file is read as
  a `ReadStream` and piped through the parser, leveraging Node.js's built-in
  backpressure mechanisms.

## Related

- [Architecture: data flow](../old/architecture.md#data-flow-section-level-conversion) — section-level conversion pipeline diagram
- [Architecture: memory profile](../old/architecture.md#memory-profile) — detailed memory breakdown during conversion
- [Output format reference](../reference/output-format.md) — output structure produced by the streaming pipeline
