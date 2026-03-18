import { describe, it, expect } from "vitest";
import { parseReleasePointFromHtml } from "./release-points.js";

/**
 * Representative HTML fixture based on the OLRC download page structure.
 * Simplified to the elements that matter for release point extraction.
 */
const OLRC_HTML_FIXTURE = `
<html>
<body>
<h3 class="releasepointinformation">Public Law 119-73 (01/23/2026) , except 119-60</h3>
<div>
  <a href="/releasepoints/us/pl/119/73not60/xml_uscAll@119-73not60.zip">XML (All Titles)</a>
  <a href="/releasepoints/us/pl/119/73not60/xml_usc01@119-73not60.zip">XML</a>
  <a href="/releasepoints/us/pl/119/73not60/xml_usc02@119-73not60.zip">XML</a>
</div>
</body>
</html>
`;

/** Fixture without the bulk download URL (only per-title links) */
const OLRC_HTML_NO_BULK = `
<html>
<body>
<h3 class="releasepointinformation">Public Law 119-80 (03/15/2026)</h3>
<div>
  <a href="/releasepoints/us/pl/119/80/xml_usc01@119-80.zip">XML</a>
  <a href="/releasepoints/us/pl/119/80/xml_usc02@119-80.zip">XML</a>
</div>
</body>
</html>
`;

/** Fixture with multiline h3 content */
const OLRC_HTML_MULTILINE_H3 = `
<html>
<body>
<h3 class="releasepointinformation">
  Public Law 119-73 (01/23/2026) , except 119-60
</h3>
<a href="/releasepoints/us/pl/119/73not60/xml_uscAll@119-73not60.zip">XML</a>
</body>
</html>
`;

/** Fixture with no recognizable release point links */
const OLRC_HTML_NO_LINKS = `
<html>
<body>
<h3 class="releasepointinformation">Public Law 119-73</h3>
<p>No download links here</p>
</body>
</html>
`;

/** Fixture without exclusions in release point */
const OLRC_HTML_NO_EXCLUSIONS = `
<html>
<body>
<h3 class="releasepointinformation">Public Law 119-43 (08/15/2025)</h3>
<a href="/releasepoints/us/pl/119/43/xml_uscAll@119-43.zip">XML</a>
</body>
</html>
`;

describe("parseReleasePointFromHtml", () => {
  it("extracts release point from bulk download URL", () => {
    const result = parseReleasePointFromHtml(OLRC_HTML_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.releasePoint).toBe("119-73not60");
  });

  it("extracts description from h3 heading", () => {
    const result = parseReleasePointFromHtml(OLRC_HTML_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.description).toBe("Public Law 119-73 (01/23/2026) , except 119-60");
  });

  it("falls back to single-title URL when bulk URL is absent", () => {
    const result = parseReleasePointFromHtml(OLRC_HTML_NO_BULK);
    expect(result).not.toBeNull();
    expect(result!.releasePoint).toBe("119-80");
    expect(result!.description).toBe("Public Law 119-80 (03/15/2026)");
  });

  it("handles release points without exclusion suffixes", () => {
    const result = parseReleasePointFromHtml(OLRC_HTML_NO_EXCLUSIONS);
    expect(result).not.toBeNull();
    expect(result!.releasePoint).toBe("119-43");
  });

  it("handles multiline h3 content", () => {
    const result = parseReleasePointFromHtml(OLRC_HTML_MULTILINE_H3);
    expect(result).not.toBeNull();
    expect(result!.releasePoint).toBe("119-73not60");
    expect(result!.description).toBe("Public Law 119-73 (01/23/2026) , except 119-60");
  });

  it("returns null when no download links are found", () => {
    const result = parseReleasePointFromHtml(OLRC_HTML_NO_LINKS);
    expect(result).toBeNull();
  });

  it("returns null for empty HTML", () => {
    expect(parseReleasePointFromHtml("")).toBeNull();
  });

  it("returns empty description when h3 is missing", () => {
    const html = `<a href="xml_uscAll@119-80.zip">XML</a>`;
    const result = parseReleasePointFromHtml(html);
    expect(result).not.toBeNull();
    expect(result!.releasePoint).toBe("119-80");
    expect(result!.description).toBe("");
  });
});
