/**
 * Reads section-level _meta.json files and generates a sitemap index
 * with per-title sitemap files. The sitemap protocol limits each file
 * to 50,000 URLs, so we split by title (each title's chapters + sections
 * fit comfortably under that limit).
 *
 * Output:
 *   public/sitemap.xml           — sitemap index
 *   public/sitemap-pages.xml     — static pages (/, /usc/)
 *   public/sitemap-title-NN.xml  — per-title (title + chapters + sections)
 *
 * Usage: npx tsx scripts/generate-sitemap.ts
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CONTENT_ROOT = process.env.CONTENT_DIR ?? "./content";
const BASE_URL = process.env.SITE_URL ?? "https://lexbuild.dev";
const OUTPUT_DIR = "./public";

async function main() {
  const uscDir = join(CONTENT_ROOT, "section", "usc");
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(uscDir, { withFileTypes: true });
  } catch {
    console.error(`Content directory not found: ${uscDir}\nRun generate-content.sh first.`);
    process.exit(1);
  }
  const titleDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("title-"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sitemapFiles: string[] = [];
  let totalUrls = 0;

  // Static pages sitemap
  const staticUrls = [urlEntry("/"), urlEntry("/usc/")];
  const staticFilename = "sitemap-pages.xml";
  await writeFile(join(OUTPUT_DIR, staticFilename), urlsetXml(staticUrls), "utf-8");
  sitemapFiles.push(staticFilename);
  totalUrls += staticUrls.length;

  // Per-title sitemaps
  for (const dir of titleDirs) {
    const metaPath = join(uscDir, dir.name, "_meta.json");
    let raw: string;
    try {
      raw = await readFile(metaPath, "utf-8");
    } catch {
      console.warn(`  skipping ${dir.name}: missing _meta.json`);
      continue;
    }
    let meta: Record<string, unknown>;
    try {
      meta = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.warn(`  skipping ${dir.name}: malformed _meta.json`);
      continue;
    }
    const chapters = meta.chapters as Record<string, unknown>[] | undefined;

    const urls: string[] = [];

    // Title page
    urls.push(urlEntry(`/usc/${dir.name}/`));

    for (const ch of chapters ?? []) {
      const chDir = ch.directory as string;

      // Chapter page
      urls.push(urlEntry(`/usc/${dir.name}/${chDir}/`));

      // Section pages
      const sections = ch.sections as Record<string, unknown>[] | undefined;
      for (const s of sections ?? []) {
        const file = (s.file as string).replace(/\.md$/, "");
        urls.push(urlEntry(`/usc/${dir.name}/${chDir}/${file}/`));
      }
    }

    const filename = `sitemap-${dir.name}.xml`;
    await writeFile(join(OUTPUT_DIR, filename), urlsetXml(urls), "utf-8");
    sitemapFiles.push(filename);
    totalUrls += urls.length;
  }

  // Include reserved Title 53 if no content directory exists
  if (!titleDirs.some((d) => d.name === "title-53")) {
    const urls = [urlEntry("/usc/title-53/")];
    const filename = "sitemap-title-53.xml";
    await writeFile(join(OUTPUT_DIR, filename), urlsetXml(urls), "utf-8");
    sitemapFiles.push(filename);
    totalUrls += urls.length;
  }

  // Sitemap index
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map((f) => `  <sitemap><loc>${escapeXml(`${BASE_URL}/${f}`)}</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  await writeFile(join(OUTPUT_DIR, "sitemap.xml"), indexXml, "utf-8");

  console.log(
    `wrote sitemap index + ${sitemapFiles.length} sitemap files (${totalUrls.toLocaleString()} URLs total)`,
  );
}

function urlsetXml(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function urlEntry(path: string): string {
  return `  <url><loc>${escapeXml(`${BASE_URL}${path}`)}</loc></url>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
