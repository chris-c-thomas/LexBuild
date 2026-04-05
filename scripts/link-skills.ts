#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const AGENTS_SKILLS = path.join(ROOT, ".agents", "skills");
const CLAUDE_SKILLS = path.join(ROOT, ".claude", "skills");

const FORCE = process.argv.includes("--force");

async function isSymlink(p: string) {
  try {
    const stat = await fs.lstat(p);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

async function removeIfNeeded(dest: string) {
  try {
    const stat = await fs.lstat(dest);

    if (stat.isSymbolicLink()) {
      await fs.unlink(dest);
      return;
    }

    if (FORCE) {
      // Only remove if it's empty (safety guard)
      const files = await fs.readdir(dest);
      if (files.length === 0) {
        await fs.rmdir(dest);
        return;
      }

      console.warn(`Skipping non-empty directory: ${dest}`);
    }
  } catch {
    // doesn't exist
  }
}

async function main() {
  // Validate source
  await fs.access(AGENTS_SKILLS);

  // Ensure target dir
  await fs.mkdir(CLAUDE_SKILLS, { recursive: true });

  const entries = await fs.readdir(AGENTS_SKILLS, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const src = path.join(AGENTS_SKILLS, entry.name);
    const dest = path.join(CLAUDE_SKILLS, entry.name);

    await removeIfNeeded(dest);

    try {
      await fs.lstat(dest);
      // Still exists (non-force or skipped)
      continue;
    } catch {}

    const relativeSrc = path.relative(CLAUDE_SKILLS, src);

    await fs.symlink(relativeSrc, dest, "junction");

    console.log(`Linked: ${dest} -> ${relativeSrc}`);
  }

  console.log("Skill linking complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});