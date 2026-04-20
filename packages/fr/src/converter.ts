/**
 * Federal Register conversion orchestrator.
 *
 * Discovers downloaded FR XML files, parses them with FrASTBuilder,
 * enriches frontmatter with JSON sidecar metadata, renders via core's
 * renderDocument, and writes structured Markdown output.
 *
 * Processes FR documents in a single streaming pass: parse each XML file,
 * render Markdown, and write output immediately. No link pre-registration
 * since FR documents rarely cross-reference each other.
 */

import { createReadStream, existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { XMLParser, renderDocument, createLinkResolver, writeFileIfChanged, mkdir } from "@lexbuild/core";
import type { LevelNode, EmitContext } from "@lexbuild/core";
import { FrASTBuilder } from "./fr-builder.js";
import type { FrDocumentXmlMeta } from "./fr-builder.js";
import { buildFrFrontmatter } from "./fr-frontmatter.js";
import type { FrDocumentJsonMeta } from "./fr-frontmatter.js";
import { buildFrOutputPath } from "./fr-path.js";
import { FR_DOCUMENT_TYPE_KEYS } from "./fr-elements.js";
import type { FrDocumentType } from "./fr-elements.js";

// ── Public types ──

/** Progress info for conversion callback */
export interface FrConvertProgress {
  /** Documents converted so far */
  documentsConverted: number;
  /** XML files processed so far */
  filesProcessed: number;
  /** Total XML files to process */
  totalFiles: number;
  /** Current XML file being processed */
  currentFile: string;
}

/** Options for converting FR documents */
export interface FrConvertOptions {
  /** Path to input file or directory containing .xml/.json files */
  input: string;
  /** Output root directory */
  output: string;
  /** Link style for cross-references */
  linkStyle: "relative" | "canonical" | "plaintext";
  /** Parse only, don't write files */
  dryRun: boolean;
  /** Filter: start date (YYYY-MM-DD) */
  from?: string | undefined;
  /** Filter: end date (YYYY-MM-DD) */
  to?: string | undefined;
  /** Filter: document types */
  types?: FrDocumentType[] | undefined;
  /** Progress callback */
  onProgress?: ((progress: FrConvertProgress) => void) | undefined;
}

/** Result of a conversion operation */
export interface FrConvertResult {
  /** Number of documents converted */
  documentsConverted: number;
  /** Paths of written files */
  files: string[];
  /** Total estimated tokens */
  totalTokenEstimate: number;
  /** Peak RSS in bytes */
  peakMemoryBytes: number;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/** Collected document info during parsing */
interface CollectedDoc {
  node: LevelNode;
  context: EmitContext;
  xmlMeta: FrDocumentXmlMeta;
  jsonMeta?: FrDocumentJsonMeta;
  publicationDate: string;
  documentNumber: string;
}

/** Set of valid FR document type element names for filtering */
const FR_DOC_TYPE_SET = new Set<string>(FR_DOCUMENT_TYPE_KEYS);

// ── Public function ──

/**
 * Convert FR XML documents to Markdown.
 *
 * Supports both single-file mode (input is a .xml path) and batch mode
 * (input is a directory containing year/month/doc.xml structure).
 */
export async function convertFrDocuments(options: FrConvertOptions): Promise<FrConvertResult> {
  const xmlFiles = await discoverXmlFiles(options.input, options.from, options.to);

  let documentsConverted = 0;
  let totalTokenEstimate = 0;
  let peakMemoryBytes = 0;

  const linkResolver = createLinkResolver();

  // Stream: parse each file, render, and write immediately.
  // FR documents rarely cross-reference each other, so we skip the two-pass
  // link registration that USC/eCFR use. This keeps memory bounded for
  // bulk XML processing (750k+ documents across 9,500+ files).
  let filesProcessed = 0;
  for (const xmlPath of xmlFiles) {
    let collected: CollectedDoc[];
    try {
      collected = await parseXmlFile(xmlPath);
    } catch (err) {
      console.warn(
        `Warning: Failed to parse ${xmlPath}: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
      );
      continue;
    }

    for (const doc of collected) {
      // Apply type filter
      if (options.types && options.types.length > 0) {
        if (
          !FR_DOC_TYPE_SET.has(doc.xmlMeta.documentType) ||
          !options.types.includes(doc.xmlMeta.documentType as FrDocumentType)
        ) {
          continue;
        }
      }

      // Precise day-level date filter using publication_date from the JSON
      // sidecar. The discovery-time filter is only month-level (path-inferred
      // dates use YYYY-MM-01), so mid-month --from/--to values would otherwise
      // over- or under-include. When no JSON sidecar is present, fall back to
      // the coarse month-level filter already applied at discovery time.
      if ((options.from || options.to) && doc.jsonMeta) {
        if (options.from && doc.publicationDate < options.from) continue;
        if (options.to && doc.publicationDate > options.to) continue;
      }

      if (options.dryRun) {
        documentsConverted++;
        continue;
      }

      const outputPath = buildFrOutputPath(doc.documentNumber, doc.publicationDate, options.output);

      const frontmatter = buildFrFrontmatter(doc.node, doc.context, doc.xmlMeta, doc.jsonMeta);

      const markdown = renderDocument(doc.node, frontmatter, {
        headingOffset: 0,
        linkStyle: options.linkStyle,
        resolveLink: options.linkStyle === "relative" ? (id) => linkResolver.resolve(id, outputPath) : undefined,
      });

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFileIfChanged(outputPath, markdown, "utf-8");

      documentsConverted++;
      totalTokenEstimate += Math.round(markdown.length / 4);

      // Track memory
      const mem = process.memoryUsage().rss;
      if (mem > peakMemoryBytes) {
        peakMemoryBytes = mem;
      }
    }

    filesProcessed++;

    options.onProgress?.({
      documentsConverted,
      filesProcessed,
      totalFiles: xmlFiles.length,
      currentFile: xmlPath,
    });
  }

  return {
    documentsConverted,
    files: [], // Don't accumulate 750k+ file paths in memory
    totalTokenEstimate,
    peakMemoryBytes,
    dryRun: options.dryRun,
  };
}

// ── Private helpers ──

/**
 * Parse a single XML file and collect document nodes + metadata.
 */
async function parseXmlFile(xmlPath: string): Promise<CollectedDoc[]> {
  const collected: CollectedDoc[] = [];

  const builder = new FrASTBuilder({
    onEmit: (node, context) => {
      // Snapshot metas at emit time
      const currentMetas = builder.getDocumentMetas();
      const meta = currentMetas[currentMetas.length - 1];
      if (!meta) {
        console.warn(
          `Warning: No XML metadata extracted for emitted document in ${xmlPath}. ` +
            `Frontmatter will have empty document_type and document_number.`,
        );
      }
      collected.push({
        node,
        context,
        xmlMeta: meta ?? { documentType: "", documentTypeNormalized: "" },
        publicationDate: "",
        documentNumber: meta?.documentNumber ?? "",
      });
    },
  });

  const parser = new XMLParser({ defaultNamespace: "" });
  parser.on("openElement", (name, attrs) => builder.onOpenElement(name, attrs));
  parser.on("closeElement", (name) => builder.onCloseElement(name));
  parser.on("text", (text) => builder.onText(text));

  const stream = createReadStream(xmlPath, "utf-8");
  await parser.parseStream(stream);

  // Try to load JSON sidecar
  const jsonPath = xmlPath.replace(/\.xml$/, ".json");
  let jsonMeta: FrDocumentJsonMeta | undefined;
  if (existsSync(jsonPath)) {
    try {
      const raw = await readFile(jsonPath, "utf-8");
      jsonMeta = JSON.parse(raw) as FrDocumentJsonMeta;
    } catch (err) {
      console.warn(
        `Warning: Failed to parse JSON sidecar ${jsonPath}: ${err instanceof Error ? err.message : String(err)}. Continuing without enriched metadata.`,
      );
    }
  }

  // Enrich collected docs with JSON metadata and publication date
  for (const doc of collected) {
    if (jsonMeta && jsonMeta.document_number === doc.documentNumber) {
      doc.jsonMeta = jsonMeta;
      doc.publicationDate = jsonMeta.publication_date;
    } else {
      // Infer date from file path (downloads/fr/YYYY/MM/doc.xml)
      const inferredDate = inferDateFromPath(xmlPath);
      if (!inferredDate) {
        console.warn(
          `Warning: No publication date for document ${doc.documentNumber || "(unknown)"} — ` +
            `no JSON sidecar and path ${xmlPath} has no YYYY/MM/ pattern. Output will be in 0000/00/.`,
        );
      }
      doc.publicationDate = inferredDate;
    }
  }

  return collected;
}

/**
 * Discover XML files in a directory or return the single file path.
 *
 * Applies a coarse month-level date filter when `from`/`to` are provided.
 * Callers should apply precise day-level filtering using publication_date
 * from each document's JSON sidecar.
 *
 * @internal Exported for testing.
 */
export async function discoverXmlFiles(input: string, from?: string, to?: string): Promise<string[]> {
  let inputStat;
  try {
    inputStat = await stat(input);
  } catch (err) {
    throw new Error(`Cannot access input path "${input}": ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }

  if (inputStat.isFile()) {
    return [input];
  }

  if (!inputStat.isDirectory()) {
    throw new Error(`Input path "${input}" is not a file or directory`);
  }

  // Recursively find all .xml files
  const xmlFiles: string[] = [];
  await walkDir(input, xmlFiles);

  // Coarse month-level filter from file paths. Per-document paths only encode
  // YYYY/MM, so `inferDateFromPath` returns YYYY-MM-01 — a strict day-level
  // comparison against a mid-month `from` would exclude every file in that
  // month. Filter by month here; precise day-level filtering happens in
  // `convertFrDocuments` using publication_date from each JSON sidecar.
  let filtered = xmlFiles;
  if (from || to) {
    const fromMonth = from?.slice(0, 7);
    const toMonth = to?.slice(0, 7);
    filtered = xmlFiles.filter((f) => {
      const date = inferDateFromPath(f);
      if (!date) return true; // Can't filter if no date in path
      const fileMonth = date.slice(0, 7);
      if (fromMonth && fileMonth < fromMonth) return false;
      if (toMonth && fileMonth > toMonth) return false;
      return true;
    });
  }

  return filtered.sort();
}

/** Recursively walk a directory collecting .xml files */
async function walkDir(dir: string, results: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".xml")) {
      results.push(fullPath);
    }
  }
}

/**
 * Infer a date string from the file path. Used when no JSON sidecar is available.
 *
 * Supports two patterns:
 *   - Per-document: "downloads/fr/2026/03/doc.xml" → "2026-03-01"
 *   - Govinfo bulk: "downloads/fr/bulk/2026/FR-2026-03-02.xml" → "2026-03-02"
 */
/** @internal Exported for testing. */
export function inferDateFromPath(filePath: string): string {
  // Govinfo bulk: FR-YYYY-MM-DD.xml
  const bulkMatch = /FR-(\d{4})-(\d{2})-(\d{2})\.xml$/.exec(filePath);
  if (bulkMatch) {
    return `${bulkMatch[1]}-${bulkMatch[2]}-${bulkMatch[3]}`;
  }

  // Per-document: YYYY/MM/doc.xml
  const perDocMatch = /(\d{4})\/(\d{2})\/[^/]+\.xml$/.exec(filePath);
  if (perDocMatch) {
    return `${perDocMatch[1]}-${perDocMatch[2]}-01`;
  }

  return "";
}
