import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat, writeFile as fsWriteFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFileIfChanged } from "./fs.js";

describe("writeFileIfChanged", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "lexbuild-fs-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it("writes a new file when it does not exist and returns true", async () => {
    const filePath = join(tmpDir, "new.md");
    const result = await writeFileIfChanged(filePath, "hello world");

    expect(result).toBe(true);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("hello world");
  });

  it("skips write when content is identical and returns false", async () => {
    const filePath = join(tmpDir, "unchanged.md");
    await fsWriteFile(filePath, "same content", "utf-8");

    const originalStat = await stat(filePath);

    // Small delay to ensure mtime would differ if rewritten
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await writeFileIfChanged(filePath, "same content");

    expect(result).toBe(false);
    const newStat = await stat(filePath);
    expect(newStat.mtimeMs).toBe(originalStat.mtimeMs);
  });

  it("writes when content differs and returns true", async () => {
    const filePath = join(tmpDir, "changed.md");
    await fsWriteFile(filePath, "old content", "utf-8");

    const result = await writeFileIfChanged(filePath, "new content");

    expect(result).toBe(true);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("new content");
  });

  it("handles nested directories when file does not exist", async () => {
    const filePath = join(tmpDir, "sub", "dir", "file.md");
    // writeFileIfChanged does not create directories — caller must mkdir first
    // This test verifies it throws for missing parent (same as writeFile)
    await expect(writeFileIfChanged(filePath, "content")).rejects.toThrow();
  });
});
