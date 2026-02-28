import { describe, it, expect } from "vitest";
import { USLM_NAMESPACE, XHTML_NAMESPACE, DC_NAMESPACE, DCTERMS_NAMESPACE } from "./index.js";

describe("@law2md/core", () => {
  it("exports USLM namespace constant", () => {
    expect(USLM_NAMESPACE).toBe("http://xml.house.gov/schemas/uslm/1.0");
  });

  it("exports XHTML namespace constant", () => {
    expect(XHTML_NAMESPACE).toBe("http://www.w3.org/1999/xhtml");
  });

  it("exports Dublin Core namespace constants", () => {
    expect(DC_NAMESPACE).toBe("http://purl.org/dc/elements/1.1/");
    expect(DCTERMS_NAMESPACE).toBe("http://purl.org/dc/terms/");
  });
});
