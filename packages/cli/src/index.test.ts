import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const CLI_PATH = resolve(import.meta.dirname, "../dist/index.js");

describe("law2md CLI", () => {
  it("shows help text", () => {
    const output = execFileSync("node", [CLI_PATH, "--help"], {
      encoding: "utf-8",
    });
    expect(output).toContain("law2md");
    expect(output).toContain("convert");
  });

  it("shows version", () => {
    const output = execFileSync("node", [CLI_PATH, "--version"], {
      encoding: "utf-8",
    });
    expect(output.trim()).toBe("0.1.0");
  });

  it("shows convert command help", () => {
    const output = execFileSync("node", [CLI_PATH, "convert", "--help"], {
      encoding: "utf-8",
    });
    expect(output).toContain("Convert USC XML");
    expect(output).toContain("--output");
    expect(output).toContain("--link-style");
  });
});
