/**
 * `law2md convert` command — converts USC XML files to Markdown.
 */

import { Command } from "commander";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { convertTitle } from "@law2md/usc";

/** Parsed options from the convert command */
interface ConvertCommandOptions {
  output: string;
  linkStyle: "relative" | "canonical" | "plaintext";
  includeSourceCredits: boolean;
  verbose: boolean;
}

export const convertCommand = new Command("convert")
  .description("Convert USC XML file(s) to Markdown")
  .argument("<input>", "Path to a USC XML file")
  .option("-o, --output <dir>", "Output directory", "./output")
  .option(
    "--link-style <style>",
    'Cross-reference link style: "relative", "canonical", or "plaintext"',
    "plaintext",
  )
  .option("--include-source-credits", "Include source credit annotations", true)
  .option("--no-include-source-credits", "Exclude source credit annotations")
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (input: string, options: ConvertCommandOptions) => {
    const inputPath = resolve(input);

    if (!existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }

    const outputPath = resolve(options.output);

    if (options.verbose) {
      console.log(`Input:  ${inputPath}`);
      console.log(`Output: ${outputPath}`);
      console.log(`Link style: ${options.linkStyle}`);
      console.log(`Source credits: ${options.includeSourceCredits}`);
      console.log("");
    }

    const startTime = performance.now();

    try {
      const result = await convertTitle({
        input: inputPath,
        output: outputPath,
        linkStyle: options.linkStyle,
        includeSourceCredits: options.includeSourceCredits,
      });

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

      console.log(
        `Converted ${result.titleName} (Title ${result.titleNumber}): ${result.sectionsWritten} sections in ${elapsed}s`,
      );

      if (options.verbose && result.files.length > 0) {
        console.log(`\nFiles written:`);
        for (const file of result.files) {
          console.log(`  ${file}`);
        }
      }
    } catch (err) {
      console.error(`Error converting ${inputPath}:`, err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });
