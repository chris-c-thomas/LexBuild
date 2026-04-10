import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Request timeout middleware.
 *
 * Races the downstream handler against a timer. If the handler hasn't settled
 * within the deadline, a 504 Gateway Timeout is thrown (caught by errorHandler).
 *
 * Note: better-sqlite3 queries are synchronous and block the event loop, so this
 * cannot interrupt them mid-execution. It does protect async handlers (e.g., the
 * Meilisearch search proxy) and prevents responses from being held open indefinitely.
 */
export function requestTimeout(ms: number): MiddlewareHandler {
  return async (_c, next) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new HTTPException(504, { message: `Request exceeded ${ms}ms timeout` }));
      }, ms);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
