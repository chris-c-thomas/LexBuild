/** law2md CLI — Convert U.S. legislative XML to structured Markdown */

import { Command } from "commander";
import { convertCommand } from "./commands/convert.js";

const program = new Command();

program
  .name("law2md")
  .description("Convert U.S. legislative XML (USLM) to structured Markdown for AI/RAG ingestion")
  .version("0.1.0");

program.addCommand(convertCommand);

program.parse();
