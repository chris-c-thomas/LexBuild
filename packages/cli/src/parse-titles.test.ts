import { describe, it, expect } from "vitest";
import { parseTitles } from "./parse-titles.js";

describe("parseTitles", () => {
  it("parses a single number", () => {
    expect(parseTitles("29")).toEqual([29]);
  });

  it("parses comma-separated numbers", () => {
    expect(parseTitles("1,3,8,11")).toEqual([1, 3, 8, 11]);
  });

  it("parses a range", () => {
    expect(parseTitles("1-5")).toEqual([1, 2, 3, 4, 5]);
  });

  it("parses mixed ranges and numbers", () => {
    expect(parseTitles("1-5,8,11")).toEqual([1, 2, 3, 4, 5, 8, 11]);
  });

  it("parses multiple ranges", () => {
    expect(parseTitles("1-3,10-12")).toEqual([1, 2, 3, 10, 11, 12]);
  });

  it("deduplicates overlapping ranges", () => {
    expect(parseTitles("1-5,3-7")).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("deduplicates repeated numbers", () => {
    expect(parseTitles("1,1,2,2")).toEqual([1, 2]);
  });

  it("sorts the result", () => {
    expect(parseTitles("11,3,1,8")).toEqual([1, 3, 8, 11]);
  });

  it("handles whitespace around segments", () => {
    expect(parseTitles(" 1 , 3 , 5 ")).toEqual([1, 3, 5]);
  });

  it("handles single-element range (start equals end)", () => {
    expect(parseTitles("5-5")).toEqual([5]);
  });

  it("accepts boundary values 1 and 54", () => {
    expect(parseTitles("1,54")).toEqual([1, 54]);
  });

  it("accepts full range 1-54", () => {
    const result = parseTitles("1-54");
    expect(result).toHaveLength(54);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(54);
  });

  describe("error cases", () => {
    it("throws on empty string", () => {
      expect(() => parseTitles("")).toThrow("cannot be empty");
    });

    it("throws on whitespace-only string", () => {
      expect(() => parseTitles("   ")).toThrow("cannot be empty");
    });

    it("throws on non-numeric input", () => {
      expect(() => parseTitles("abc")).toThrow('Invalid number "abc"');
    });

    it("throws on title number 0", () => {
      expect(() => parseTitles("0")).toThrow("out of range");
    });

    it("throws on title number 55", () => {
      expect(() => parseTitles("55")).toThrow("out of range");
    });

    it("throws on negative number", () => {
      expect(() => parseTitles("-1")).toThrow("Invalid");
    });

    it("throws on descending range", () => {
      expect(() => parseTitles("5-1")).toThrow("start 5 must be");
    });

    it("throws on empty segment from trailing comma", () => {
      expect(() => parseTitles("1,")).toThrow("empty segment");
    });

    it("throws on empty segment from leading comma", () => {
      expect(() => parseTitles(",1")).toThrow("empty segment");
    });

    it("throws on float", () => {
      expect(() => parseTitles("1.5")).toThrow("Invalid number");
    });

    it("throws on range with too many dashes", () => {
      expect(() => parseTitles("1-3-5")).toThrow("Invalid range");
    });
  });
});
