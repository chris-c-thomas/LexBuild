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

describe("GET /api/health", () => {
  it("returns 200 with health status", async () => {
    const res = await ctx.app.request("/api/health");
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    expect(body.database.connected).toBe(true);
    expect(body.database.documents).toBe(FIXTURE_COUNTS.total);
    expect(body.uptime).toBeGreaterThan(0);
    expect(body.version).toBeDefined();
  });

  it("includes schema_version in database status", async () => {
    const res = await ctx.app.request("/api/health");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.database.schema_version).toBeTypeOf("number");
    expect(body.database.schema_version).toBeGreaterThan(0);
  });
});
