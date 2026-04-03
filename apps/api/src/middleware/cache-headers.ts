import { createMiddleware } from "hono/factory";

export interface CacheOptions {
  /** Cache duration in seconds */
  maxAge: number;
  /** Cloudflare edge cache duration (s-maxage) */
  sMaxAge?: number;
  /** Allow stale content while revalidating */
  staleWhileRevalidate?: number;
}

/** Sets Cache-Control headers on successful GET responses. */
export const cacheHeaders = (options: CacheOptions) =>
  createMiddleware(async (c, next) => {
    await next();

    // Only cache successful GET responses
    if (c.req.method !== "GET" || c.res.status !== 200) return;

    const parts = [`public`, `max-age=${options.maxAge}`];
    if (options.sMaxAge !== undefined) parts.push(`s-maxage=${options.sMaxAge}`);
    if (options.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    c.header("Cache-Control", parts.join(", "));
  });
