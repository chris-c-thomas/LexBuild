import { describe, it, expect } from "vitest";
import { USLM_NAMESPACE } from "./index.js";

describe("@law2md/usc", () => {
  it("re-exports USLM_NAMESPACE from core", () => {
    expect(USLM_NAMESPACE).toBe("http://xml.house.gov/schemas/uslm/1.0");
  });
});
