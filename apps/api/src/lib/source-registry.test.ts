import { describe, it, expect } from "vitest";
import { toDbSource, toApiSource, API_SOURCES } from "./source-registry.js";

describe("toDbSource", () => {
  it("maps usc to usc", () => {
    expect(toDbSource("usc")).toBe("usc");
  });

  it("maps ecfr to ecfr", () => {
    expect(toDbSource("ecfr")).toBe("ecfr");
  });

  it("maps fr to fr", () => {
    expect(toDbSource("fr")).toBe("fr");
  });
});

describe("toApiSource", () => {
  it("maps usc to usc", () => {
    expect(toApiSource("usc")).toBe("usc");
  });

  it("maps ecfr to ecfr", () => {
    expect(toApiSource("ecfr")).toBe("ecfr");
  });

  it("maps fr to fr", () => {
    expect(toApiSource("fr")).toBe("fr");
  });

  it("passes through unknown source as-is", () => {
    expect(toApiSource("unknown")).toBe("unknown");
  });
});

describe("API_SOURCES", () => {
  it("defines all three sources", () => {
    expect(Object.keys(API_SOURCES)).toEqual(["usc", "ecfr", "fr"]);
  });

  it("each source has required fields", () => {
    for (const source of Object.values(API_SOURCES)) {
      expect(source).toHaveProperty("id");
      expect(source).toHaveProperty("name");
      expect(source).toHaveProperty("shortName");
      expect(source).toHaveProperty("description");
      expect(source).toHaveProperty("urlPrefix");
      expect(source).toHaveProperty("hierarchy");
      expect(source).toHaveProperty("filterableFields");
      expect(source).toHaveProperty("sortableFields");
      expect(source).toHaveProperty("hasTitles");
    }
  });

  it("USC and eCFR have titles, FR does not", () => {
    expect(API_SOURCES.usc.hasTitles).toBe(true);
    expect(API_SOURCES.ecfr.hasTitles).toBe(true);
    expect(API_SOURCES.fr.hasTitles).toBe(false);
  });
});
