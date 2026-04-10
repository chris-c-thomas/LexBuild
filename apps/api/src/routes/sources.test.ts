import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TestContext } from "../test-helpers.js";
import { setupTestApp } from "../test-helpers.js";
import { FIXTURE_COUNTS } from "../db/test-fixtures.js";

let ctx: TestContext;

beforeAll(() => {
  ctx = setupTestApp();
});
afterAll(() => {
  ctx.cleanup();
});

describe("GET /api/sources", () => {
  it("returns 200 with all three sources", async () => {
    const res = await ctx.app.request("/api/sources");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(3);

    const ids = body.data.map((s: { id: string }) => s.id);
    expect(ids).toContain("usc");
    expect(ids).toContain("ecfr");
    expect(ids).toContain("fr");
  });

  it("returns correct document counts per source", async () => {
    const res = await ctx.app.request("/api/sources");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;

    const byId = Object.fromEntries(
      body.data.map((s: { id: string; document_count: number }) => [s.id, s.document_count]),
    );
    expect(byId.usc).toBe(FIXTURE_COUNTS.usc);
    expect(byId.ecfr).toBe(FIXTURE_COUNTS.ecfr);
    expect(byId.fr).toBe(FIXTURE_COUNTS.fr);
  });

  it("includes source metadata fields", async () => {
    const res = await ctx.app.request("/api/sources");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const usc = body.data.find((s: { id: string }) => s.id === "usc");

    expect(usc.name).toBe("United States Code");
    expect(usc.short_name).toBe("USC");
    expect(usc.description).toBeDefined();
    expect(usc.url_prefix).toBe("/usc");
    expect(usc.hierarchy).toEqual(["title", "chapter", "section"]);
    expect(usc.filterable_fields).toBeInstanceOf(Array);
    expect(usc.sortable_fields).toBeInstanceOf(Array);
    expect(usc.has_titles).toBe(true);
  });

  it("marks FR source as not having titles", async () => {
    const res = await ctx.app.request("/api/sources");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const fr = body.data.find((s: { id: string }) => s.id === "fr");
    expect(fr.has_titles).toBe(false);
  });

  it("includes meta with api_version and timestamp", async () => {
    const res = await ctx.app.request("/api/sources");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.meta.api_version).toBe("v1");
    expect(body.meta.timestamp).toBeDefined();
  });
});
