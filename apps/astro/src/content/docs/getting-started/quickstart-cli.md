---
title: "CLI Quickstart"
description: "Install LexBuild and convert your first legal source in under 5 minutes."
order: 2
---

# CLI Quickstart

Get up and running with the LexBuild CLI in under 5 minutes.

## Prerequisites

- Node.js 22 or later
- npm, pnpm, or yarn

## Install

Run the CLI directly with `npx` (no global install required):

```bash
npx @lexbuild/cli --version
```

Or install globally:

```bash
npm install -g @lexbuild/cli
```

## Download and Convert

Download and convert U.S. Code Title 1 (General Provisions):

```bash
# Download the XML source
lexbuild download-usc --title 1

# Convert to Markdown
lexbuild convert-usc --title 1
```

Output is written to `./output/usc/title-01/` with one Markdown file per section.

## Inspect the Output

Each section produces a standalone `.md` file with YAML frontmatter:

```yaml
---
identifier: "/us/usc/t1/s1"
title: "1 USC § 1 - Words denoting number, gender, and so forth"
source: "usc"
title_number: 1
section_number: "1"
---
```

> [!NOTE]
> The `--title` flag accepts a title number (1-54). Use `--all` to process all titles.

## Next Steps

- [CLI Installation](/docs/cli/installation) -- Build from source, global install options
- [Commands](/docs/cli/commands) -- Full command reference with flags and examples
- [Output Format](/docs/cli/output-format) -- Markdown structure, YAML schema, file paths
