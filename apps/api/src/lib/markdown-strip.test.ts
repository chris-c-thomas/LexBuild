import { describe, it, expect } from "vitest";
import { stripMarkdown } from "./markdown-strip.js";

describe("stripMarkdown", () => {
  it("strips heading markers", () => {
    expect(stripMarkdown("# Title\n## Subtitle")).toBe("Title\nSubtitle");
  });

  it("strips bold markers", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("*italic text*")).toBe("italic text");
  });

  it("strips bold-italic markers", () => {
    expect(stripMarkdown("***bold italic***")).toBe("bold italic");
  });

  it("strips link syntax", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe("click here");
  });

  it("strips blockquote markers", () => {
    expect(stripMarkdown("> quoted text")).toBe("quoted text");
  });

  it("strips horizontal rules", () => {
    expect(stripMarkdown("above\n---\nbelow")).toBe("above\n\nbelow");
  });

  it("strips footnote references", () => {
    expect(stripMarkdown("text[^1] more")).toBe("text more");
  });

  it("collapses excessive newlines", () => {
    expect(stripMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims whitespace", () => {
    expect(stripMarkdown("  content  ")).toBe("content");
  });

  it("handles empty string", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("passes through plain text unchanged", () => {
    expect(stripMarkdown("just plain text")).toBe("just plain text");
  });
});
