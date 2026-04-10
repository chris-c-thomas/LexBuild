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

describe("GET /api/ecfr/documents", () => {
  it("returns paginated list of all eCFR documents", async () => {
    const res = await ctx.app.request("/api/ecfr/documents");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;

    expect(body.data).toHaveLength(FIXTURE_COUNTS.ecfr);
    expect(body.pagination.total).toBe(FIXTURE_COUNTS.ecfr);
    expect(body.pagination.has_more).toBe(false);
  });

  it("filters by title_number", async () => {
    const res = await ctx.app.request("/api/ecfr/documents?title_number=17");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;

    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    for (const doc of body.data) {
      expect(doc.metadata.title_number).toBe(17);
    }
  });

  it("filters by title_number with single result", async () => {
    const res = await ctx.app.request("/api/ecfr/documents?title_number=40");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;

    expect(body.data).toHaveLength(1);
    expect(body.data[0].identifier).toBe("/us/cfr/t40/s60.1");
  });

  it("returns empty list for nonexistent title", async () => {
    const res = await ctx.app.request("/api/ecfr/documents?title_number=99");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;

    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it("returns listing metadata with source as ecfr", async () => {
    const res = await ctx.app.request("/api/ecfr/documents");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    for (const doc of body.data) {
      expect(doc.source).toBe("ecfr");
    }
  });
});

describe("GET /api/ecfr/documents/{identifier}", () => {
  // Hono {identifier} param matches a single path segment, so identifiers with "/"
  // must be URL-encoded.
  const t17s240_10b5 = encodeURIComponent("/us/cfr/t17/s240.10b-5");
  const t40s60_1 = encodeURIComponent("/us/cfr/t40/s60.1");

  it("returns a single document by URL-encoded identifier", async () => {
    const res = await ctx.app.request(`/api/ecfr/documents/${t17s240_10b5}`);
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;

    expect(body.data.identifier).toBe("/us/cfr/t17/s240.10b-5");
    expect(body.data.source).toBe("ecfr");
    expect(body.data.metadata.display_title).toContain("240.10b-5");
    expect(body.data.body).toBeDefined();
  });

  it("includes eCFR-specific metadata fields", async () => {
    const res = await ctx.app.request(`/api/ecfr/documents/${t17s240_10b5}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const meta = body.data.metadata;

    expect(meta.authority).toBe("15 U.S.C. 78a et seq.");
    expect(meta.agency).toBe("Securities and Exchange Commission");
    expect(meta.regulatory_source).toBe("[17 FR 3301, Apr. 15, 1952]");
    expect(meta.cfr_part).toBe("240");
  });

  it("returns 404 for nonexistent document", async () => {
    const encoded = encodeURIComponent("/us/cfr/t99/s999");
    const res = await ctx.app.request(`/api/ecfr/documents/${encoded}`);
    expect(res.status).toBe(404);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("sets ETag header and supports conditional requests", async () => {
    const first = await ctx.app.request(`/api/ecfr/documents/${t17s240_10b5}`);
    const etag = first.headers.get("ETag")!;
    expect(etag).toBeDefined();

    const second = await ctx.app.request(`/api/ecfr/documents/${t17s240_10b5}`, {
      headers: { "If-None-Match": etag },
    });
    expect(second.status).toBe(304);
  });

  it("returns markdown with ?format=markdown", async () => {
    const res = await ctx.app.request(`/api/ecfr/documents/${t17s240_10b5}?format=markdown`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/markdown");
    const text = await res.text();
    expect(text).toContain("---");
    expect(text).toContain("# 17 CFR 240.10b-5");
  });

  it("includes cfr_subpart when present", async () => {
    const res = await ctx.app.request(`/api/ecfr/documents/${t40s60_1}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.data.metadata.cfr_subpart).toBe("A");
  });
});
