import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  // Bundle all dependencies into a single file for simpler deployment
  // Except better-sqlite3 which has native bindings
  noExternal: [/(.*)/],
  external: ["better-sqlite3"],
});
