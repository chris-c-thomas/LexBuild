/**
 * `law2md convert` command — converts USC XML files to Markdown.
 */

import { Command } from "commander";
import { existsSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { convertTitle } from "@law2md/usc";
import {
  createSpinner,
  summaryBlock,
  formatDuration,
  formatBytes,
  formatNumber,
  success,
  error,
} from "../ui.js";
import { parseTitles } from "../parse-titles.js";

/** Parsed options from the convert command */
interface ConvertCommandOptions {
  output: string;
  titles?: string | undefined;
  inputDir: string;
  granularity: "section" | "chapter";
  linkStyle: "relative" | "canonical" | "plaintext";
  includeSourceCredits: boolean;
  includeNotes: boolean;
  includeEditorialNotes: boolean;
  includeStatutoryNotes: boolean;
  includeAmendments: boolean;
  dryRun: boolean;
  verbose: boolean;
}

/** Build the shared convert options from CLI flags. */
function buildConvertOptions(inputPath: string, outputPath: string, options: ConvertCommandOptions) {
  const hasSelectiveFlags =
    options.includeEditorialNotes || options.includeStatutoryNotes || options.includeAmendments;
  const includeNotes = hasSelectiveFlags ? false : options.includeNotes;

  return {
    input: inputPath,
    output: outputPath,
    granularity: options.granularity,
    linkStyle: options.linkStyle,
    includeSourceCredits: options.includeSourceCredits,
    includeNotes,
    includeEditorialNotes: options.includeEditorialNotes,
    includeStatutoryNotes: options.includeStatutoryNotes,
    includeAmendments: options.includeAmendments,
    dryRun: options.dryRun,
  };
}

/** Resolve the XML file path for a given title number. */
function titleXmlPath(inputDir: string, titleNum: number): string {
  const padded = String(titleNum).padStart(2, "0");
  return join(inputDir, `usc${padded}.xml`);
}

/** Try to resolve a USC XML path, falling back to zero-padded filename. */
export function resolveUscXmlPath(inputPath: string): string | undefined {
  if (existsSync(inputPath)) return inputPath;

  // Check if filename matches usc{N}.xml pattern and try zero-padded
  const dir = dirname(inputPath);
  const base = basename(inputPath);
  const match = /^usc(\d+)\.xml$/.exec(base);
  if (match) {
    const padded = match[1].padStart(2, "0");
    const paddedPath = join(dir, `usc${padded}.xml`);
    if (existsSync(paddedPath)) return paddedPath;
  }

  return undefined;
}

/** Convert a single XML file and print its summary. */
async function convertSingleFile(
  inputPath: string,
  outputPath: string,
  options: ConvertCommandOptions,
  spinnerLabel: string,
) {
  const spinner = createSpinner(spinnerLabel);
  spinner.start();

  const startTime = performance.now();

  try {
    const result = await convertTitle(buildConvertOptions(inputPath, outputPath, options));
    const elapsed = performance.now() - startTime;

    spinner.stop();

    const rows: Array<[string, string]> = [
      ["Sections", formatNumber(result.sectionsWritten)],
      ["Chapters", formatNumber(result.chapterCount)],
      ["Est. Tokens", formatNumber(result.totalTokenEstimate)],
    ];

    if (!result.dryRun) {
      rows.push(["Files Written", formatNumber(result.files.length)]);
    }

    rows.push(
      ["Peak Memory", formatBytes(result.peakMemoryBytes)],
      ["Duration", formatDuration(elapsed)],
    );

    const titleLabel = result.dryRun
      ? `law2md — Title ${result.titleNumber}: ${result.titleName} [dry-run]`
      : `law2md — Title ${result.titleNumber}: ${result.titleName}`;

    const outputRelative = relative(process.cwd(), outputPath) || outputPath;

    const output = summaryBlock({
      title: titleLabel,
      rows: [...rows, ["Output", outputRelative]],
      footer: result.dryRun ? success("Dry run complete") : success("Conversion complete"),
    });
    process.stdout.write(output);

    if (options.verbose && !result.dryRun && result.files.length > 0) {
      console.log("  Files written:");
      for (const file of result.files) {
        console.log(`    ${relative(process.cwd(), file) || file}`);
      }
      console.log("");
    }

    return result;
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export const convertCommand = new Command("convert")
  .description("Convert USC XML file(s) to Markdown")
  .argument("[input]", "Path to a USC XML file")
  .option("-o, --output <dir>", "Output directory", "./output")
  .option("--titles <spec>", "Title(s) to convert (e.g. 1, 1-5, 1,3,8, 1-5,8,11)")
  .option(
    "-i, --input-dir <dir>",
    "Directory containing USC XML files",
    "./downloads/usc/xml",
  )
  .option(
    "-g, --granularity <level>",
    'Output granularity: "section" (one file per section) or "chapter" (sections inline)',
    "section",
  )
  .option(
    "--link-style <style>",
    'Cross-reference link style: "relative", "canonical", or "plaintext"',
    "plaintext",
  )
  .option("--include-source-credits", "Include source credit annotations", true)
  .option("--no-include-source-credits", "Exclude source credit annotations")
  .option("--include-notes", "Include all notes (default)", true)
  .option("--no-include-notes", "Exclude all notes")
  .option("--include-editorial-notes", "Include editorial notes only", false)
  .option("--include-statutory-notes", "Include statutory notes only", false)
  .option("--include-amendments", "Include amendment history notes only", false)
  .option("--dry-run", "Parse and report structure without writing files", false)
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (input: string | undefined, options: ConvertCommandOptions) => {
    // Validate: must specify <input> or --titles
    if (!input && !options.titles) {
      console.error(
        error("Specify an input file or --titles <spec> (e.g. --titles 1-5,8,11)"),
      );
      process.exit(1);
    }

    if (input && options.titles) {
      console.error(error("Cannot specify both <input> file and --titles"));
      process.exit(1);
    }

    const outputPath = resolve(options.output);
    const dryRunLabel = options.dryRun ? " [dry-run]" : "";

    // Single-file mode
    if (input) {
      const rawPath = resolve(input);
      const inputPath = resolveUscXmlPath(rawPath);
      if (!inputPath) {
        console.error(error(`Input file not found: ${rawPath}`));
        process.exit(1);
      }
      await convertSingleFile(inputPath, outputPath, options, `Converting${dryRunLabel}...`);
      return;
    }

    // Multi-title mode — options.titles is guaranteed non-undefined by the check above
    const titlesSpec = options.titles as string;
    let titles: number[];
    try {
      titles = parseTitles(titlesSpec);
    } catch (err) {
      console.error(error(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }

    const inputDir = resolve(options.inputDir);
    const totalTitles = titles.length;
    const overallStart = performance.now();
    let totalSections = 0;

    for (const [i, titleNum] of titles.entries()) {
      const xmlPath = titleXmlPath(inputDir, titleNum);

      if (!existsSync(xmlPath)) {
        console.error(error(`XML file not found: ${xmlPath}`));
        process.exit(1);
      }

      const label = `Converting Title ${titleNum}${dryRunLabel} (${i + 1}/${totalTitles})...`;
      const result = await convertSingleFile(xmlPath, outputPath, options, label);
      if (result) {
        totalSections += result.sectionsWritten;
      }
    }

    // Aggregate footer
    const overallElapsed = performance.now() - overallStart;
    const titleWord = totalTitles === 1 ? "title" : "titles";
    const sectionWord = totalSections === 1 ? "section" : "sections";
    console.log(
      `  ${success(`Converted ${totalTitles} ${titleWord} (${formatNumber(totalSections)} ${sectionWord}) in ${formatDuration(overallElapsed)}`)}`,
    );
    console.log("");
  });
