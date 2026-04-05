---
title: "Installation"
description: "Install the LexBuild CLI via npx, npm global install, or build from source."
order: 1
---

# Installation

The LexBuild CLI requires **Node.js 22** or later.

## Using npx (Recommended)

Run any CLI command without installing globally:

```bash
npx @lexbuild/cli download-usc --title 1
npx @lexbuild/cli convert-usc --title 1
```

This always uses the latest published version.

## Global Install

Install once, use the `lexbuild` command directly:

```bash
npm install -g @lexbuild/cli
```

Verify the installation:

```bash
lexbuild --version
```

## Build from Source

Clone the monorepo and build all packages:

```bash
git clone https://github.com/chris-c-thomas/LexBuild.git
cd LexBuild
pnpm install
pnpm turbo build
```

Run the CLI from the built output:

```bash
node packages/cli/dist/index.js --version
```

> [!WARNING]
> Building from source requires `pnpm` (not npm or yarn) due to the workspace configuration.

## System Requirements

| Requirement | Minimum |
|---|---|
| Node.js | 22.0.0 |
| Disk space | ~2 GB for full USC + eCFR XML downloads |
| Memory | ~512 MB (SAX streaming keeps memory bounded) |
