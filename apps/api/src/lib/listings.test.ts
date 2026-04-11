import { describe, it, expect } from "vitest";
import { buildListingResponse } from "./listings.js";
import type { QueryResult } from "../db/queries.js";

function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    rows: [
      {
        id: "us-usc-t1-s1",
        identifier: "/us/usc/t1/s1",
        source: "usc",
        display_title: "1 U.S.C. 1",
        title_number: 1,
        title_name: "General Provisions",
        section_number: "1",
        section_name: "Words denoting number",
        chapter_number: "1",
        chapter_name: "Rules of Construction",
        part_number: null,
        part_name: null,
        legal_status: "law",
        positive_law: 1,
        status: "in_force",
        currency: "2024-01-03",
        last_updated: "2024-01-03",
        document_number: null,
        document_type: null,
        publication_date: null,
        agency: null,
        content_hash: "abc123",
        format_version: "1.1.0",
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
    hasMore: false,
    cursorUsed: false,
    ...overrides,
  };
}

describe("buildListingResponse", () => {
  it("returns correct envelope shape", () => {
    const result = buildListingResponse(makeResult(), "/api/usc/documents", {});
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("meta");
    expect(result).toHaveProperty("pagination");
    expect(result.meta.api_version).toBe("v1");
  });

  it("maps rows to data items with id, identifier, source, metadata", () => {
    const result = buildListingResponse(makeResult(), "/api/usc/documents", {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("us-usc-t1-s1");
    expect(result.data[0]!.identifier).toBe("/us/usc/t1/s1");
    expect(result.data[0]!.source).toBe("usc");
    expect(result.data[0]!.metadata.display_title).toBe("1 U.S.C. 1");
  });

  it("converts positive_law from integer to boolean in metadata", () => {
    const result = buildListingResponse(makeResult(), "/api/usc/documents", {});
    expect(result.data[0]!.metadata.positive_law).toBe(true);
  });

  it("generates next URL when hasMore is true", () => {
    const result = buildListingResponse(
      makeResult({ total: 50, limit: 20, offset: 0, hasMore: true }),
      "/api/usc/documents",
      { sort: "identifier" },
    );
    expect(result.pagination.has_more).toBe(true);
    expect(result.pagination.next).toContain("/api/usc/documents?");
    expect(result.pagination.next).toContain("offset=20");
    expect(result.pagination.next).toContain("limit=20");
  });

  it("sets next to null when hasMore is false", () => {
    const result = buildListingResponse(makeResult(), "/api/usc/documents", {});
    expect(result.pagination.has_more).toBe(false);
    expect(result.pagination.next).toBeNull();
  });

  it("preserves query params in next URL", () => {
    const result = buildListingResponse(
      makeResult({ total: 50, limit: 10, offset: 0, hasMore: true }),
      "/api/usc/documents",
      { title_number: 1, sort: "identifier" },
    );
    expect(result.pagination.next).toContain("title_number=1");
    expect(result.pagination.next).toContain("sort=identifier");
  });

  it("generates cursor-based next URL when cursor pagination is used", () => {
    const result = buildListingResponse(
      makeResult({
        total: null,
        limit: 10,
        hasMore: true,
        cursorUsed: true,
        nextCursor: "/us/usc/t1/s1",
      }),
      "/api/usc/documents",
      { sort: "identifier", cursor: "/us/usc/t1/preamble" },
    );

    expect(result.pagination.total).toBeNull();
    expect(result.pagination.next).toContain("cursor=%2Fus%2Fusc%2Ft1%2Fs1");
    expect(result.pagination.next).not.toContain("offset=");
  });

  it("omits undefined query params from next URL", () => {
    const result = buildListingResponse(
      makeResult({ total: 50, limit: 20, offset: 0, hasMore: true }),
      "/api/usc/documents",
      { title_number: undefined, sort: "identifier" },
    );
    expect(result.pagination.next).not.toContain("title_number");
  });
});
