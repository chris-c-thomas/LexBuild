import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { copyFile, readdir, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { convertFrDocuments, discoverXmlFiles, inferDateFromPath } from "./converter.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../../fixtures/fragments/fr");
const TEST_OUTPUT = resolve(import.meta.dirname, "../../../.test-output-fr");

/** Recursively find all .md files under a directory */
async function findMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findMdFiles(full)));
      } else if (entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results;
}

describe("convertFrDocuments", () => {
  beforeAll(async () => {
    if (existsSync(TEST_OUTPUT)) {
      await rm(TEST_OUTPUT, { recursive: true });
    }
    await mkdir(TEST_OUTPUT, { recursive: true });
  });

  afterAll(async () => {
    if (existsSync(TEST_OUTPUT)) {
      await rm(TEST_OUTPUT, { recursive: true });
    }
  });

  describe("single-file mode", () => {
    it("converts a single XML file to Markdown", async () => {
      const outputDir = join(TEST_OUTPUT, "single");
      const result = await convertFrDocuments({
        input: resolve(FIXTURES_DIR, "simple-rule.xml"),
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
      });

      expect(result.documentsConverted).toBe(1);
      expect(result.dryRun).toBe(false);
      expect(result.totalTokenEstimate).toBeGreaterThan(0);

      // Output file should exist and contain frontmatter
      const mdFiles = await findMdFiles(join(outputDir, "fr"));
      expect(mdFiles.length).toBe(1);

      const content = await readFile(mdFiles[0]!, "utf-8");
      expect(content).toContain("---");
      expect(content).toContain('source: "fr"');
      expect(content).toContain('legal_status: "authoritative_unofficial"');
    });

    it("produces Markdown with correct frontmatter fields", async () => {
      const outputDir = join(TEST_OUTPUT, "frontmatter");
      await convertFrDocuments({
        input: resolve(FIXTURES_DIR, "simple-rule.xml"),
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
      });

      const mdFiles = await findMdFiles(join(outputDir, "fr"));
      const content = await readFile(mdFiles[0]!, "utf-8");
      expect(content).toContain("title_number: 0");
      expect(content).toContain('title_name: "Federal Register"');
      expect(content).toContain("positive_law: false");
      expect(content).toContain('document_type: "rule"');
    });
  });

  describe("dry-run mode", () => {
    it("returns count without writing files", async () => {
      const outputDir = join(TEST_OUTPUT, "dryrun");
      const result = await convertFrDocuments({
        input: resolve(FIXTURES_DIR, "simple-rule.xml"),
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: true,
      });

      expect(result.documentsConverted).toBe(1);
      expect(result.totalTokenEstimate).toBe(0);
      expect(result.dryRun).toBe(true);

      // Output directory should not have any files
      expect(existsSync(join(outputDir, "fr"))).toBe(false);
    });
  });

  describe("directory mode", () => {
    it("converts all XML files in a directory", async () => {
      const outputDir = join(TEST_OUTPUT, "batch");
      const result = await convertFrDocuments({
        input: FIXTURES_DIR,
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
      });

      // 3 fixture files: simple-rule.xml, notice.xml, rule-with-regtext.xml
      expect(result.documentsConverted).toBe(3);
      const mdFiles = await findMdFiles(join(outputDir, "fr"));
      expect(mdFiles.length).toBe(3);
    });
  });

  describe("type filtering", () => {
    it("filters by document type", async () => {
      const outputDir = join(TEST_OUTPUT, "typefilter");
      const result = await convertFrDocuments({
        input: FIXTURES_DIR,
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
        types: ["NOTICE"],
      });

      // Only notice.xml should be converted
      expect(result.documentsConverted).toBe(1);
    });
  });

  describe("discoverXmlFiles date filtering", () => {
    let filterRoot: string;

    beforeAll(async () => {
      filterRoot = join(TEST_OUTPUT, "discover-date-filter");
      // Create a synthetic YYYY/MM/ tree with empty .xml files. Content doesn't
      // matter — discoverXmlFiles filters by path, not content.
      const months = ["2026/02", "2026/03", "2026/04", "2026/05"];
      for (const month of months) {
        const dir = join(filterRoot, month);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "doc.xml"), "<RULE></RULE>", "utf-8");
      }
    });

    it("includes month of from-date when from is mid-month (regression: --days N mid-month)", async () => {
      // Reproduces the bug where --from 2026-04-09 against paths like
      // downloads/fr/2026/04/*.xml (path-inferred as 2026-04-01) excluded
      // every April file because "2026-04-01" < "2026-04-09".
      const files = await discoverXmlFiles(filterRoot, "2026-04-09", "2026-04-19");
      expect(files.some((f) => f.includes("/2026/04/"))).toBe(true);
      expect(files.some((f) => f.includes("/2026/02/"))).toBe(false);
      expect(files.some((f) => f.includes("/2026/03/"))).toBe(false);
      expect(files.some((f) => f.includes("/2026/05/"))).toBe(false);
    });

    it("includes both boundary months when range spans month boundary", async () => {
      const files = await discoverXmlFiles(filterRoot, "2026-03-20", "2026-04-05");
      expect(files.some((f) => f.includes("/2026/03/"))).toBe(true);
      expect(files.some((f) => f.includes("/2026/04/"))).toBe(true);
      expect(files.some((f) => f.includes("/2026/02/"))).toBe(false);
      expect(files.some((f) => f.includes("/2026/05/"))).toBe(false);
    });

    it("excludes months fully outside the range", async () => {
      const files = await discoverXmlFiles(filterRoot, "2026-03-01", "2026-03-31");
      const months = new Set(files.map((f) => f.match(/\/(\d{4}\/\d{2})\//)?.[1]).filter(Boolean));
      expect(months).toEqual(new Set(["2026/03"]));
    });

    it("returns all files when no date filter is given", async () => {
      const files = await discoverXmlFiles(filterRoot);
      expect(files.length).toBe(4);
    });
  });

  describe("convertFrDocuments date filtering (day-level via JSON sidecar)", () => {
    let dayFilterRoot: string;

    beforeAll(async () => {
      dayFilterRoot = join(TEST_OUTPUT, "convert-date-filter");
      const monthDir = join(dayFilterRoot, "2026", "04");
      await mkdir(monthDir, { recursive: true });

      // Three docs in the same month, with different publication_dates.
      // Use the real simple-rule.xml fixture for all three (content doesn't
      // matter for filter testing) but each with a unique doc-number sidecar.
      const source = resolve(FIXTURES_DIR, "simple-rule.xml");
      const docs = [
        { num: "2026-07100", pubDate: "2026-04-05" }, // Before from
        { num: "2026-07400", pubDate: "2026-04-15" }, // Inside range
        { num: "2026-07800", pubDate: "2026-04-25" }, // After to
      ];

      for (const { num, pubDate } of docs) {
        const xmlPath = join(monthDir, `${num}.xml`);
        await copyFile(source, xmlPath);
        // Rewrite the FRDOC line so the builder extracts the synthetic doc number.
        const xml = await readFile(xmlPath, "utf-8");
        const patched = xml.replace(/\[FR Doc\. [^\]]+\]/, `[FR Doc. ${num} Filed 4-1-26; 8:45 am]`);
        await writeFile(xmlPath, patched, "utf-8");

        const jsonMeta = {
          document_number: num,
          type: "Rule",
          title: "Test",
          publication_date: pubDate,
          citation: "91 FR 1000",
          volume: 91,
          start_page: 1000,
          end_page: 1010,
          agencies: [],
          cfr_references: [],
          docket_ids: [],
          regulation_id_numbers: [],
          topics: [],
          full_text_xml_url: "",
        };
        await writeFile(join(monthDir, `${num}.json`), JSON.stringify(jsonMeta), "utf-8");
      }
    });

    it("converts only docs whose publication_date falls within the range", async () => {
      const outputDir = join(TEST_OUTPUT, "day-filter-mid");
      const result = await convertFrDocuments({
        input: dayFilterRoot,
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
        from: "2026-04-10",
        to: "2026-04-20",
      });

      expect(result.documentsConverted).toBe(1);
      const mdFiles = await findMdFiles(join(outputDir, "fr"));
      expect(mdFiles.some((f) => f.includes("2026-07400"))).toBe(true);
      expect(mdFiles.some((f) => f.includes("2026-07100"))).toBe(false);
      expect(mdFiles.some((f) => f.includes("2026-07800"))).toBe(false);
    });

    it("converts all in-month docs when the range covers the full month", async () => {
      const outputDir = join(TEST_OUTPUT, "day-filter-full");
      const result = await convertFrDocuments({
        input: dayFilterRoot,
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
        from: "2026-04-01",
        to: "2026-04-30",
      });

      expect(result.documentsConverted).toBe(3);
    });

    it("regression: --from mid-month (2026-04-09) includes matching April docs", async () => {
      // The exact scenario that broke update-fr.sh --days 10 run on 2026-04-19.
      const outputDir = join(TEST_OUTPUT, "day-filter-regression");
      const result = await convertFrDocuments({
        input: dayFilterRoot,
        output: outputDir,
        linkStyle: "plaintext",
        dryRun: false,
        from: "2026-04-09",
        to: "2026-04-19",
      });

      expect(result.documentsConverted).toBe(1);
      const mdFiles = await findMdFiles(join(outputDir, "fr"));
      expect(mdFiles.some((f) => f.includes("2026-07400"))).toBe(true);
    });
  });

  describe("inferDateFromPath", () => {
    it("extracts date from govinfo bulk path", () => {
      expect(inferDateFromPath("downloads/fr/bulk/2026/FR-2026-03-02.xml")).toBe("2026-03-02");
    });

    it("extracts year-month from per-document path", () => {
      expect(inferDateFromPath("downloads/fr/2026/03/2026-06029.xml")).toBe("2026-03-01");
    });

    it("returns empty string for non-matching path", () => {
      expect(inferDateFromPath("/tmp/random-file.xml")).toBe("");
    });
  });

  describe("error handling", () => {
    it("throws descriptive error for non-existent input", async () => {
      await expect(
        convertFrDocuments({
          input: "/nonexistent/path",
          output: TEST_OUTPUT,
          linkStyle: "plaintext",
          dryRun: false,
        }),
      ).rejects.toThrow('Cannot access input path "/nonexistent/path"');
    });
  });
});
