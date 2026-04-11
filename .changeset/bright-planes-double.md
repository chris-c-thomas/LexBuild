---
"@lexbuild/cli": patch
"@lexbuild/core": patch
---

Persist API aggregate snapshots during ingest so the Data API can serve stats and Federal Register hierarchy endpoints without recomputing full-table aggregates on live requests.