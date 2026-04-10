import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TestContext } from "../test-helpers.js";
import { setupTestApp } from "../test-helpers.js";
import { buildMeiliFilter, buildMeiliSort, parseFacets } from "./search.js";

let ctx: TestContext;

beforeAll(() => {
  ctx = setupTestApp();
});
afterAll(() => {
  ctx.cleanup();
});

describe("GET /api/search", () => {
  it("returns 503 when Meilisearch is unavailable", async () => {
    const res = await ctx.app.request("/api/search?q=test");
    expect(res.status).toBe(503);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.error.status).toBe(503);
    expect(body.error.message).toContain("Search service unavailable");
  });
});

describe("buildMeiliFilter", () => {
  it("returns undefined when no filter params are set", () => {
    expect(buildMeiliFilter({ q: "test", limit: 20, offset: 0, highlight: true })).toBeUndefined();
  });

  it("builds source filter", () => {
    const filter = buildMeiliFilter({
      q: "test",
      source: "usc",
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toBe('source = "usc"');
  });

  it("builds title_number filter", () => {
    const filter = buildMeiliFilter({
      q: "test",
      title_number: 17,
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toBe("title_number = 17");
  });

  it("builds document_type filter", () => {
    const filter = buildMeiliFilter({
      q: "test",
      document_type: "rule",
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toBe('document_type = "rule"');
  });

  it("builds agency filter with sanitization", () => {
    const filter = buildMeiliFilter({
      q: "test",
      agency: 'EPA "injection',
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toBe('agency = "EPA injection"');
  });

  it("builds date range filters", () => {
    const filter = buildMeiliFilter({
      q: "test",
      date_from: "2026-01-01",
      date_to: "2026-12-31",
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toBe('publication_date >= "2026-01-01" AND publication_date <= "2026-12-31"');
  });

  it("combines multiple filters with AND", () => {
    const filter = buildMeiliFilter({
      q: "test",
      source: "fr",
      document_type: "rule",
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toContain('source = "fr"');
    expect(filter).toContain('document_type = "rule"');
    expect(filter).toContain(" AND ");
  });

  it("builds status filter with sanitization", () => {
    const filter = buildMeiliFilter({
      q: "test",
      status: 'in_force"\\malicious',
      limit: 20,
      offset: 0,
      highlight: true,
    });
    expect(filter).toBe('status = "in_forcemalicious"');
  });
});

describe("buildMeiliSort", () => {
  it("returns undefined for undefined sort", () => {
    expect(buildMeiliSort(undefined)).toBeUndefined();
  });

  it("returns undefined for relevance sort", () => {
    expect(buildMeiliSort("relevance")).toBeUndefined();
  });

  it("builds ascending sort", () => {
    expect(buildMeiliSort("publication_date")).toEqual(["publication_date:asc"]);
  });

  it("builds descending sort with - prefix", () => {
    expect(buildMeiliSort("-publication_date")).toEqual(["publication_date:desc"]);
  });

  it("returns undefined for disallowed sort field", () => {
    expect(buildMeiliSort("some_random_field")).toBeUndefined();
  });

  it("handles all allowed sort fields", () => {
    expect(buildMeiliSort("title_number")).toEqual(["title_number:asc"]);
    expect(buildMeiliSort("identifier")).toEqual(["identifier:asc"]);
    expect(buildMeiliSort("-document_number")).toEqual(["document_number:desc"]);
  });
});

describe("parseFacets", () => {
  it("returns default facets when param is undefined", () => {
    expect(parseFacets(undefined)).toEqual(["source", "status"]);
  });

  it("parses comma-separated facet names", () => {
    const facets = parseFacets("source,document_type,agency");
    expect(facets).toEqual(["source", "document_type", "agency"]);
  });

  it("filters out disallowed facet names", () => {
    const facets = parseFacets("source,invalid_facet,title_number");
    expect(facets).toEqual(["source", "title_number"]);
    expect(facets).not.toContain("invalid_facet");
  });

  it("handles whitespace in facet params", () => {
    const facets = parseFacets("source , document_type , agency");
    expect(facets).toEqual(["source", "document_type", "agency"]);
  });

  it("returns empty array when all facets are invalid", () => {
    const facets = parseFacets("invalid1,invalid2");
    expect(facets).toEqual([]);
  });
});
