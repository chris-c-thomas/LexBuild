import { describe, it, expect } from "vitest";
import { HTTPException } from "hono/http-exception";
import { errorHandler } from "./error-handler.js";

describe("errorHandler", () => {
  // The errorHandler middleware wraps `await next()` in try/catch and returns
  // structured JSON for caught errors. We test the middleware function directly
  // by invoking it with mock Context and next callbacks, which avoids Hono's
  // internal dispatch layer that intercepts errors before middleware catch blocks.

  function makeMockContext() {
    let jsonResult: { body: unknown; status: number } | null = null;
    const headers = new Map<string, string>();

    const c = {
      get: () => undefined,
      req: { method: "GET", path: "/test" },
      json: (body: unknown, status: number) => {
        jsonResult = { body, status };
        return new Response(JSON.stringify(body), { status });
      },
      header: (key: string, value: string) => {
        headers.set(key, value);
      },
    };

    return { c, getResult: () => jsonResult, headers };
  }

  it("passes through when next succeeds", async () => {
    const handler = errorHandler();
    const { c, getResult } = makeMockContext();
    let nextCalled = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock context for unit test
    await handler(c as any, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(getResult()).toBeNull();
  });

  it("catches HTTPException and returns structured error with correct status", async () => {
    const handler = errorHandler();
    const { c, getResult } = makeMockContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock context for unit test
    await handler(c as any, async () => {
      throw new HTTPException(404, { message: "Not found" });
    });

    const result = getResult();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
    const body = result!.body as { error: { status: number; code: string; message: string } };
    expect(body.error.status).toBe(404);
    expect(body.error.code).toBe("REQUEST_ERROR");
    expect(body.error.message).toBe("Not found");
  });

  it("catches HTTPException 403 and returns REQUEST_ERROR code", async () => {
    const handler = errorHandler();
    const { c, getResult } = makeMockContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock context for unit test
    await handler(c as any, async () => {
      throw new HTTPException(403, { message: "Forbidden" });
    });

    const result = getResult();
    expect(result!.status).toBe(403);
    const body = result!.body as { error: { status: number; code: string; message: string } };
    expect(body.error.code).toBe("REQUEST_ERROR");
    expect(body.error.message).toBe("Forbidden");
  });

  it("catches generic errors and returns 500 with masked message", async () => {
    const handler = errorHandler();
    const { c, getResult } = makeMockContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock context for unit test
    await handler(c as any, async () => {
      throw new Error("Database connection failed");
    });

    const result = getResult();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
    const body = result!.body as { error: { status: number; code: string; message: string } };
    expect(body.error.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    // Internal details must be masked
    expect(body.error.message).toBe("Internal server error");
    expect(body.error.message).not.toContain("Database");
  });

  it("handles non-Error thrown values", async () => {
    const handler = errorHandler();
    const { c, getResult } = makeMockContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock context for unit test
    await handler(c as any, async () => {
      throw "string error";
    });

    const result = getResult();
    expect(result!.status).toBe(500);
    const body = result!.body as { error: { status: number; code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal server error");
  });
});
