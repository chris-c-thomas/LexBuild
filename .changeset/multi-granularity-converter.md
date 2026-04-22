---
"@lexbuild/ecfr": minor
"@lexbuild/core": minor
"@lexbuild/usc": minor
"@lexbuild/fr": minor
"@lexbuild/cli": minor
"@lexbuild/mcp": minor
---

Add single-pass multi-granularity conversion. The `convert-usc` and `convert-ecfr`
commands now accept `--granularities section,chapter,title[,part]` together with
`--output-chapter`, `--output-title`, and `--output-part` (eCFR only) to produce
every requested granularity from one parse of the source XML. The builders'
`emitAt` option accepts a `ReadonlySet<LevelType>` in addition to a single
`LevelType`, and deeper levels emit first so that higher-level emissions see the
complete subtree. Update scripts (`update-usc.sh`, `update-ecfr.sh`) collapse
their N `convert-*` invocations into one, yielding a ~40-50% reduction in the
incremental convert step's wall-clock on multi-granularity runs.

Back-compat: the existing `-g/--granularity` + `-o/--output` single-granularity
form continues to work unchanged and is mutually exclusive with
`--granularities`.
