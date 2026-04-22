---
"@lexbuild/ecfr": patch
"@lexbuild/core": patch
"@lexbuild/usc": patch
"@lexbuild/fr": patch
"@lexbuild/cli": patch
"@lexbuild/mcp": patch
---

Refresh documentation for the single-pass multi-granularity converter. README.md files across the monorepo (root, `@lexbuild/cli`, `@lexbuild/usc`, `@lexbuild/ecfr`, `@lexbuild/core`, `apps/astro`) now document the `--granularities <list>` and `--output-<granularity>` flags on `convert-usc`/`convert-ecfr`, the new `granularities` option on `convertTitle`/`convertEcfrTitle`, the builder's `ReadonlySet<LevelType>` emit mode, and the updated `update-usc.sh`/`update-ecfr.sh` single-invocation pattern. Public docs on the Astro site and internal docs under `.claude/internal/docs/` were updated in parallel. No code changes in this release — the bump exists to ship the refreshed package README copy to npm.
