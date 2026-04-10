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

describe("GET /api/stats", () => {
  it("returns 200 with total document count", async () => {
    const res = await ctx.app.request("/api/stats");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.data.total_documents).toBe(FIXTURE_COUNTS.total);
  });

  it("returns correct USC stats", async () => {
    const res = await ctx.app.request("/api/stats");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const usc = body.data.sources.usc;

    expect(usc.document_count).toBe(FIXTURE_COUNTS.usc);
    expect(usc.title_count).toBe(2); // Title 1 and Title 26
    expect(usc.last_updated).toBe("2024-01-03");
  });

  it("returns correct eCFR stats", async () => {
    const res = await ctx.app.request("/api/stats");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const ecfr = body.data.sources.ecfr;

    expect(ecfr.document_count).toBe(FIXTURE_COUNTS.ecfr);
    expect(ecfr.title_count).toBe(2); // Title 17 and Title 40
    expect(ecfr.last_updated).toBe("2024-04-01");
  });

  it("returns correct FR stats with date range", async () => {
    const res = await ctx.app.request("/api/stats");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const fr = body.data.sources.fr;

    expect(fr.document_count).toBe(FIXTURE_COUNTS.fr);
    expect(fr.date_range.earliest).toBe("2026-03-15");
    expect(fr.date_range.latest).toBe("2026-04-01");
  });

  it("returns FR document type breakdown", async () => {
    const res = await ctx.app.request("/api/stats");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const docTypes = body.data.sources.fr.document_types;

    expect(docTypes.rule).toBe(1);
    expect(docTypes.proposed_rule).toBe(1);
    expect(docTypes.notice).toBe(1);
    expect(docTypes.presidential_document).toBe(1);
  });

  it("includes database schema version", async () => {
    const res = await ctx.app.request("/api/stats");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.data.database.schema_version).toBeTypeOf("number");
    expect(body.data.database.schema_version).toBeGreaterThan(0);
  });

  it("includes meta with api_version and timestamp", async () => {
    const res = await ctx.app.request("/api/stats");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.meta.api_version).toBe("v1");
    expect(body.meta.timestamp).toBeDefined();
  });
});
