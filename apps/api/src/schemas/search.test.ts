import { describe, it, expect } from "vitest";
import { searchQuerySchema } from "./search.js";

describe("searchQuerySchema", () => {
  it("requires q parameter", () => {
    expect(() => searchQuerySchema.parse({})).toThrow();
  });

  it("rejects empty q", () => {
    expect(() => searchQuerySchema.parse({ q: "" })).toThrow();
  });

  it("rejects q exceeding 500 characters", () => {
    expect(() => searchQuerySchema.parse({ q: "a".repeat(501) })).toThrow();
  });

  it("accepts valid q up to 500 characters", () => {
    const result = searchQuerySchema.parse({ q: "a".repeat(500) });
    expect(result.q).toHaveLength(500);
  });

  it("applies default limit of 20", () => {
    const result = searchQuerySchema.parse({ q: "test" });
    expect(result.limit).toBe(20);
  });

  it("applies default offset of 0", () => {
    const result = searchQuerySchema.parse({ q: "test" });
    expect(result.offset).toBe(0);
  });

  it("applies default highlight of true", () => {
    const result = searchQuerySchema.parse({ q: "test" });
    expect(result.highlight).toBe(true);
  });

  it("validates source enum", () => {
    const result = searchQuerySchema.parse({ q: "test", source: "usc" });
    expect(result.source).toBe("usc");
  });

  it("rejects invalid source", () => {
    expect(() => searchQuerySchema.parse({ q: "test", source: "invalid" })).toThrow();
  });

  it("validates document_type enum", () => {
    const result = searchQuerySchema.parse({ q: "test", document_type: "rule" });
    expect(result.document_type).toBe("rule");
  });

  it("validates date format", () => {
    const result = searchQuerySchema.parse({ q: "test", date_from: "2026-01-01" });
    expect(result.date_from).toBe("2026-01-01");
  });

  it("rejects invalid date format", () => {
    expect(() => searchQuerySchema.parse({ q: "test", date_from: "invalid" })).toThrow();
  });

  it("rejects limit above 100", () => {
    expect(() => searchQuerySchema.parse({ q: "test", limit: 101 })).toThrow();
  });
});
