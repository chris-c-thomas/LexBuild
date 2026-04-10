import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TestContext } from "../test-helpers.js";
import { setupTestApp } from "../test-helpers.js";

let ctx: TestContext;

beforeAll(() => {
  ctx = setupTestApp();
});
afterAll(() => {
  ctx.cleanup();
});

describe("GET /api/openapi.json", () => {
  it("returns 200 with valid OpenAPI JSON", async () => {
    const res = await ctx.app.request("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.openapi).toBe("3.1.0");
    expect(body.info).toBeDefined();
    expect(body.info.title).toBe("LexBuild API");
    expect(body.info.version).toBeDefined();
    expect(body.paths).toBeDefined();
  });

  it("includes all major endpoint paths", async () => {
    const res = await ctx.app.request("/api/openapi.json");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const paths = Object.keys(body.paths);

    expect(paths).toContain("/health");
    expect(paths).toContain("/sources");
    expect(paths).toContain("/stats");
    expect(paths).toContain("/search");
    expect(paths).toContain("/usc/documents");
    expect(paths).toContain("/usc/documents/{identifier}");
    expect(paths).toContain("/ecfr/documents");
    expect(paths).toContain("/ecfr/documents/{identifier}");
    expect(paths).toContain("/fr/documents");
    expect(paths).toContain("/fr/documents/{identifier}");
    expect(paths).toContain("/usc/titles");
    expect(paths).toContain("/ecfr/titles");
    expect(paths).toContain("/fr/years");
  });

  it("includes server configuration", async () => {
    const res = await ctx.app.request("/api/openapi.json");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.servers).toBeDefined();
    expect(body.servers).toHaveLength(1);
    expect(body.servers[0].url).toBe("https://lexbuild.dev/api");
  });

  it("includes tags for all source categories", async () => {
    const res = await ctx.app.request("/api/openapi.json");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const tagNames = body.tags.map((t: { name: string }) => t.name);

    expect(tagNames).toContain("System");
    expect(tagNames).toContain("U.S. Code");
    expect(tagNames).toContain("eCFR");
    expect(tagNames).toContain("Federal Register");
    expect(tagNames).toContain("Search");
  });
});

describe("GET /api/docs", () => {
  it("returns 301 redirect to /docs/api", async () => {
    const res = await ctx.app.request("/api/docs", { redirect: "manual" });
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("/docs/api");
  });
});
