/**
 * Meilisearch client wrapper for search functionality.
 *
 * Gated behind the ENABLE_SEARCH environment variable. When disabled,
 * the client is not instantiated and search functions return empty results.
 */

import { Meilisearch } from "meilisearch";

const INDEX_NAME = "lexbuild";

/** Singleton Meilisearch client (browser-side, search-only key). */
let client: Meilisearch | null = null;

/**
 * Initialize or return the Meilisearch client.
 * Config is passed at call time to avoid import.meta.env issues in non-Astro contexts.
 */
export function getClient(config?: { host?: string; apiKey?: string }): Meilisearch {
  if (!client) {
    client = new Meilisearch({
      host: config?.host ?? "http://127.0.0.1:7700",
      apiKey: config?.apiKey ?? "",
    });
  }
  return client;
}

/** Search document shape returned by Meilisearch. */
export interface SearchDocument {
  id: string;
  source: "usc" | "ecfr";
  title_number: number;
  title_name: string;
  identifier: string;
  heading: string;
  status: string;
  hierarchy: string[];
  url: string;
}

/** Search result from Meilisearch. */
export interface SearchResult {
  hits: SearchDocument[];
  query: string;
  processingTimeMs: number;
  estimatedTotalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
}

/** Perform a search query against the lexbuild index. */
export async function search(
  query: string,
  options?: {
    source?: "usc" | "ecfr";
    titleNumber?: number;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<SearchResult> {
  const client = getClient();
  const index = client.index<SearchDocument>(INDEX_NAME);

  const filters: string[] = [];
  if (options?.source) filters.push(`source = "${options.source}"`);
  if (options?.titleNumber) filters.push(`title_number = ${options.titleNumber}`);
  if (options?.status) filters.push(`status = "${options.status}"`);

  const result = await index.search(query, {
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    facets: ["source", "status"],
    limit: options?.limit ?? 20,
    offset: options?.offset ?? 0,
    attributesToHighlight: ["heading", "identifier"],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
  });

  return {
    hits: result.hits as SearchDocument[],
    query: result.query,
    processingTimeMs: result.processingTimeMs,
    estimatedTotalHits: result.estimatedTotalHits ?? 0,
    facetDistribution: result.facetDistribution as Record<string, Record<string, number>> | undefined,
  };
}
