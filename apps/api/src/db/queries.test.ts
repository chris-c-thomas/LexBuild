import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { createTestDatabase, FIXTURE_COUNTS } from "./test-fixtures.js";
import { queryDocuments } from "./queries.js";

describe("queryDocuments", () => {
  let db: Database.Database;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "lexbuild-queries-test-"));
    const dbPath = join(tmpDir, "test.db");
    const writeDb = createTestDatabase(dbPath);
    writeDb.close();
    db = new Database(dbPath, { readonly: true });
  });

  afterAll(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const defaults = { filters: {}, sort: "identifier", limit: 20, offset: 0 };

  describe("source filtering", () => {
    it("returns correct total count for USC", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc" });
      expect(result.total).toBe(FIXTURE_COUNTS.usc);
      expect(result.rows).toHaveLength(FIXTURE_COUNTS.usc);
    });

    it("returns correct total count for eCFR", () => {
      const result = queryDocuments(db, { ...defaults, source: "ecfr" });
      expect(result.total).toBe(FIXTURE_COUNTS.ecfr);
      expect(result.rows).toHaveLength(FIXTURE_COUNTS.ecfr);
    });

    it("returns correct total count for FR", () => {
      const result = queryDocuments(db, { ...defaults, source: "fr" });
      expect(result.total).toBe(FIXTURE_COUNTS.fr);
      expect(result.rows).toHaveLength(FIXTURE_COUNTS.fr);
    });
  });

  describe("pagination", () => {
    it("respects limit parameter", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc", limit: 2 });
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(FIXTURE_COUNTS.usc);
    });

    it("respects offset parameter", () => {
      const all = queryDocuments(db, { ...defaults, source: "usc" });
      const offset = queryDocuments(db, { ...defaults, source: "usc", offset: 2 });
      expect(offset.rows[0]!.identifier).toBe(all.rows[2]!.identifier);
    });

    it("returns hasMore: true when more results exist", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc", limit: 2 });
      expect(result.hasMore).toBe(true);
    });

    it("returns hasMore: false when at end", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc", limit: 20 });
      expect(result.hasMore).toBe(false);
    });

    it("returns correct offset in result", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc", offset: 1 });
      expect(result.offset).toBe(1);
    });
  });

  describe("column filters", () => {
    it("filters by title_number", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "usc",
        filters: { title_number: 1 },
      });
      expect(result.total).toBe(3);
      for (const row of result.rows) {
        expect(row.title_number).toBe(1);
      }
    });

    it("filters by agency", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "ecfr",
        filters: { agency: "Securities and Exchange Commission" },
      });
      expect(result.total).toBe(2);
      for (const row of result.rows) {
        expect(row.agency).toBe("Securities and Exchange Commission");
      }
    });

    it("filters by document_type", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "fr",
        filters: { document_type: "rule" },
      });
      expect(result.total).toBe(1);
      expect(result.rows[0]!.document_type).toBe("rule");
    });

    it("filters by date range with date_from", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "fr",
        filters: { date_from: "2026-04-01" },
      });
      expect(result.total).toBe(1);
      expect(result.rows[0]!.publication_date).toBe("2026-04-01");
    });

    it("filters by date range with date_to", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "fr",
        filters: { date_to: "2026-03-16" },
      });
      // Should include 2026-03-15, 2026-03-16, and 2026-03-17 is excluded
      expect(result.total).toBe(2);
    });

    it("filters by date range with both date_from and date_to", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "fr",
        filters: { date_from: "2026-03-16", date_to: "2026-03-17" },
      });
      expect(result.total).toBe(2);
    });

    it("filters by positive_law boolean", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "usc",
        filters: { positive_law: true },
      });
      expect(result.total).toBe(3);
      for (const row of result.rows) {
        expect(row.positive_law).toBe(1);
      }
    });

    it("filters by positive_law false", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "usc",
        filters: { positive_law: false },
      });
      expect(result.total).toBe(1);
      expect(result.rows[0]!.title_number).toBe(26);
    });
  });

  describe("sorting", () => {
    it("sorts ascending by identifier by default", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc" });
      const identifiers = result.rows.map((r) => r.identifier);
      const sorted = [...identifiers].sort();
      expect(identifiers).toEqual(sorted);
    });

    it("sorts descending with - prefix", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "fr",
        sort: "-publication_date",
      });
      const dates = result.rows.map((r) => r.publication_date as string);
      const sorted = [...dates].sort().reverse();
      expect(dates).toEqual(sorted);
    });

    it("falls back to identifier ASC for invalid sort field", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "usc",
        sort: "nonexistent_column",
      });
      const identifiers = result.rows.map((r) => r.identifier);
      const sorted = [...identifiers].sort();
      expect(identifiers).toEqual(sorted);
    });
  });

  describe("SQL injection prevention", () => {
    it("ignores unknown filter columns", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "usc",
        filters: { "1=1; DROP TABLE documents; --": "attack" },
      });
      // Should return all USC docs — the malicious filter is ignored
      expect(result.total).toBe(FIXTURE_COUNTS.usc);
    });

    it("ignores null and undefined filter values", () => {
      const result = queryDocuments(db, {
        ...defaults,
        source: "usc",
        filters: { title_number: undefined, status: null },
      });
      expect(result.total).toBe(FIXTURE_COUNTS.usc);
    });
  });

  describe("result shape", () => {
    it("returns rows without markdown_body or frontmatter_yaml", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc", limit: 1 });
      const row = result.rows[0]!;
      expect(row.markdown_body).toBeUndefined();
      expect(row.frontmatter_yaml).toBeUndefined();
      expect(row.identifier).toBeDefined();
      expect(row.display_title).toBeDefined();
    });

    it("includes expected listing columns", () => {
      const result = queryDocuments(db, { ...defaults, source: "usc", limit: 1 });
      const row = result.rows[0]!;
      expect(row).toHaveProperty("id");
      expect(row).toHaveProperty("identifier");
      expect(row).toHaveProperty("source");
      expect(row).toHaveProperty("display_title");
      expect(row).toHaveProperty("content_hash");
      expect(row).toHaveProperty("format_version");
    });
  });
});
