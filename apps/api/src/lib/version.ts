import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** API version read from the nearest package.json. */
export const API_VERSION = (() => {
  const dir = dirname(fileURLToPath(import.meta.url));
  // From dist/index.js: ../../package.json = apps/api/package.json
  // From src/lib/version.ts: ../../../package.json = apps/api/package.json
  for (const rel of ["../../package.json", "../../../package.json"]) {
    try {
      const raw = readFileSync(resolve(dir, rel), "utf-8");
      const version = (JSON.parse(raw) as { version: string }).version;
      if (version) return version;
    } catch {
      // try next path
    }
  }
  return process.env.npm_package_version ?? "unknown";
})();
