/** lexbuild CLI — Convert U.S. legal XML to structured Markdown */

import { createRequire } from "node:module";
import { Command } from "commander";
import { convertCommand } from "./commands/convert.js";
import { downloadCommand } from "./commands/download.js";
import { convertEcfrCommand } from "./commands/convert-ecfr.js";
import { downloadEcfrCommand } from "./commands/download-ecfr.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("lexbuild")
  .description("Convert U.S. legal XML to structured Markdown for AI/RAG ingestion")
  .version(pkg.version)
  .addHelpText(
    "after",
    `
Quick start (U.S. Code):
  $ lexbuild download --all             Download all 54 USC titles from OLRC
  $ lexbuild convert --all              Convert all downloaded USC titles
  $ lexbuild convert --titles 1         Convert USC Title 1 only

Quick start (eCFR):
  $ lexbuild download-ecfr --all        Download all 50 eCFR titles from govinfo
  $ lexbuild convert-ecfr --all         Convert all downloaded eCFR titles
  $ lexbuild convert-ecfr --titles 17   Convert eCFR Title 17 only

Documentation: https://github.com/chris-c-thomas/LexBuild`,
  );

program.addCommand(convertCommand);
program.addCommand(downloadCommand);
program.addCommand(convertEcfrCommand);
program.addCommand(downloadEcfrCommand);

program.parse();
