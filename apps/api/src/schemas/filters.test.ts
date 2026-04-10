import { describe, it, expect } from "vitest";
import { uscFilterSchema, ecfrFilterSchema, frFilterSchema } from "./filters.js";

describe("uscFilterSchema", () => {
  it("applies defaults for limit, offset, and sort", () => {
    const result = uscFilterSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.sort).toBe("identifier");
  });

  it("coerces string numbers for limit and offset", () => {
    const result = uscFilterSchema.parse({ limit: "10", offset: "5" });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(5);
  });

  it("rejects limit above 100", () => {
    expect(() => uscFilterSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects limit below 1", () => {
    expect(() => uscFilterSchema.parse({ limit: 0 })).toThrow();
  });

  it("accepts valid title_number", () => {
    const result = uscFilterSchema.parse({ title_number: "26" });
    expect(result.title_number).toBe(26);
  });

  it("accepts optional boolean positive_law", () => {
    const result = uscFilterSchema.parse({ positive_law: "true" });
    expect(result.positive_law).toBe(true);
  });
});

describe("ecfrFilterSchema", () => {
  it("applies identifier as default sort", () => {
    const result = ecfrFilterSchema.parse({});
    expect(result.sort).toBe("identifier");
  });

  it("accepts part_number filter", () => {
    const result = ecfrFilterSchema.parse({ part_number: "240" });
    expect(result.part_number).toBe("240");
  });

  it("accepts agency filter", () => {
    const result = ecfrFilterSchema.parse({ agency: "EPA" });
    expect(result.agency).toBe("EPA");
  });
});

describe("frFilterSchema", () => {
  it("applies -publication_date as default sort", () => {
    const result = frFilterSchema.parse({});
    expect(result.sort).toBe("-publication_date");
  });

  it("accepts valid date_from in YYYY-MM-DD format", () => {
    const result = frFilterSchema.parse({ date_from: "2026-01-01" });
    expect(result.date_from).toBe("2026-01-01");
  });

  it("rejects invalid date format", () => {
    expect(() => frFilterSchema.parse({ date_from: "01/01/2026" })).toThrow();
  });

  it("accepts document_type enum values", () => {
    const result = frFilterSchema.parse({ document_type: "rule" });
    expect(result.document_type).toBe("rule");
  });

  it("rejects invalid document_type", () => {
    expect(() => frFilterSchema.parse({ document_type: "invalid" })).toThrow();
  });

  it("accepts effective_date range filters", () => {
    const result = frFilterSchema.parse({
      effective_date_from: "2026-01-01",
      effective_date_to: "2026-12-31",
    });
    expect(result.effective_date_from).toBe("2026-01-01");
    expect(result.effective_date_to).toBe("2026-12-31");
  });
});
