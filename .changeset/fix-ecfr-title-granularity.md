---
"@lexbuild/ecfr": patch
"@lexbuild/core": patch
"@lexbuild/usc": patch
"@lexbuild/fr": patch
"@lexbuild/cli": patch
"@lexbuild/mcp": patch
---

Fix eCFR title- and part-granularity emission. `convert-ecfr -g title` and
`convert-ecfr -g part` previously emitted stub files containing only
frontmatter and an empty heading, because the builder's emit condition used
`>=` instead of strict equality on the level index — every intermediate level
(section, part, chapter) emitted standalone instead of aggregating into the
parent's children tree.

Align `EcfrASTBuilder` with the USLM builder's strict-equality behavior and
populate `title_name` from `node.heading` when the emitted node itself is a
title (a title has no title ancestor). Title-granularity output grows from
~289 bytes per title to ~400 KB per title with full chapter/part/section
content inlined; part-granularity output now includes section content.
