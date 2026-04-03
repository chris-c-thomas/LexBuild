import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  // Bundle all dependencies except native bindings and workspace deps
  noExternal: [/(.*)/],
  external: ["better-sqlite3", "@lexbuild/core"],
  // Provide createRequire for external CJS modules (better-sqlite3) loaded from ESM bundle
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
