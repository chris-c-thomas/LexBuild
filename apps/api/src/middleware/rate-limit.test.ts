import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestApp } from "../test-helpers.js";
import type { TestContext } from "../test-helpers.js";

describe("rateLimitMiddleware", () => {
  let ctx: TestContext;

  beforeAll(() => {
    ctx = setupTestApp();
  });

  afterAll(() => {
    ctx.cleanup();
  });

  it("returns rate-limit headers on anonymous requests", async () => {
    const res = await ctx.app.request("/api/health");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Policy")).toBe("anonymous");
  });

  it("accepts API key via X-API-Key header", async () => {
    const res = await ctx.app.request("/api/health", {
      headers: { "X-API-Key": ctx.apiKey },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Policy")).toBe("standard");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("1000");
  });

  it("accepts API key via Bearer token", async () => {
    const res = await ctx.app.request("/api/health", {
      headers: { Authorization: `Bearer ${ctx.apiKey}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Policy")).toBe("standard");
  });

  it("accepts API key via api_key query parameter", async () => {
    const res = await ctx.app.request(`/api/health?api_key=${ctx.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Policy")).toBe("standard");
  });

  it("falls back to anonymous for invalid API key", async () => {
    const res = await ctx.app.request("/api/health", {
      headers: { "X-API-Key": "lxb_invalid_key_that_does_not_exist" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Policy")).toBe("anonymous");
  });

  it("includes X-RateLimit-Remaining that decrements", async () => {
    const res1 = await ctx.app.request("/api/health", {
      headers: { "X-API-Key": ctx.apiKey },
    });
    const remaining1 = Number(res1.headers.get("X-RateLimit-Remaining"));

    const res2 = await ctx.app.request("/api/health", {
      headers: { "X-API-Key": ctx.apiKey },
    });
    const remaining2 = Number(res2.headers.get("X-RateLimit-Remaining"));

    expect(remaining2).toBeLessThan(remaining1);
  });
});
