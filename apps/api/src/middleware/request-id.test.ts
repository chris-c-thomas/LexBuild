import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requestId } from "./request-id.js";

describe("requestId", () => {
  const app = new Hono();
  app.use("*", requestId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
  app.get("/test", (c) => c.json({ requestId: (c as any).get("requestId") }));

  it("generates a UUID and sets X-Request-ID header", async () => {
    const res = await app.request("/test");
    const header = res.headers.get("X-Request-ID");
    expect(header).toBeTruthy();
    // UUID v4 format: 8-4-4-4-12 hex chars
    expect(header).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("makes request ID available via context", async () => {
    const res = await app.request("/test");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    const header = res.headers.get("X-Request-ID");
    expect(body.requestId).toBe(header);
  });

  it("echoes client-provided X-Request-ID header", async () => {
    const clientId = "custom-trace-id-12345";
    const res = await app.request("/test", {
      headers: { "X-Request-ID": clientId },
    });
    expect(res.headers.get("X-Request-ID")).toBe(clientId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertion
    const body = (await res.json()) as any;
    expect(body.requestId).toBe(clientId);
  });
});
