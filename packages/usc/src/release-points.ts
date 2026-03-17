/**
 * OLRC release point detection.
 *
 * Scrapes the OLRC download page to detect the latest release point,
 * eliminating the need to hardcode release point identifiers.
 */

/** OLRC download page URL */
const OLRC_DOWNLOAD_PAGE = "https://uscode.house.gov/download/download.shtml";

/** Detected release point information */
export interface ReleasePointInfo {
  /** Release point identifier (e.g., "119-73not60") */
  releasePoint: string;
  /** Human-readable description (e.g., "Public Law 119-73 (01/23/2026) , except 119-60") */
  description: string;
}

/**
 * Detect the latest OLRC release point by scraping the download page.
 *
 * Uses two extraction strategies for redundancy:
 * 1. Parse the release point from download URL hrefs (most reliable)
 * 2. Fall back to parsing the release point info heading
 *
 * Returns `null` if the page cannot be fetched or parsed.
 */
export async function detectLatestReleasePoint(): Promise<ReleasePointInfo | null> {
  let html: string;
  try {
    const response = await fetch(OLRC_DOWNLOAD_PAGE);
    if (!response.ok) return null;
    html = await response.text();
  } catch {
    return null;
  }

  return parseReleasePointFromHtml(html);
}

/**
 * Parse the release point from OLRC download page HTML.
 *
 * Exported for testing — prefer `detectLatestReleasePoint()` for production use.
 */
export function parseReleasePointFromHtml(html: string): ReleasePointInfo | null {
  // Strategy 1: Extract from download URL hrefs
  // Links look like: href="...xml_uscAll@119-73not60.zip"
  const urlMatch = /xml_uscAll@([\w-]+)\.zip/.exec(html);
  if (urlMatch?.[1]) {
    const releasePoint = urlMatch[1];
    const description = parseDescription(html);
    return { releasePoint, description };
  }

  // Strategy 2: Extract from any single-title download URL
  // Links look like: href="...xml_usc01@119-73not60.zip"
  const singleUrlMatch = /xml_usc\d{2}@([\w-]+)\.zip/.exec(html);
  if (singleUrlMatch?.[1]) {
    const releasePoint = singleUrlMatch[1];
    const description = parseDescription(html);
    return { releasePoint, description };
  }

  return null;
}

/**
 * Parse the human-readable description from the release point heading.
 *
 * The heading looks like:
 * `<h3 class="releasepointinformation">Public Law 119-73 (01/23/2026) , except 119-60</h3>`
 */
function parseDescription(html: string): string {
  const h3Match = /<h3[^>]*class="releasepointinformation"[^>]*>(.*?)<\/h3>/i.exec(html);
  return h3Match?.[1]?.trim() ?? "";
}
