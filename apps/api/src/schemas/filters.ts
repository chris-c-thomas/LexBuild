import { z } from "@hono/zod-openapi";
import { paginationSchema } from "./pagination.js";

/** USC document listing filter parameters. */
export const uscFilterSchema = paginationSchema.extend({
  title_number: z.coerce.number().int().optional(),
  chapter_number: z.string().optional(),
  status: z.string().optional(),
  positive_law: z.coerce.boolean().optional(),
  legal_status: z.string().optional(),
  sort: z.string().optional().default("identifier").openapi({
    description: "Sort field. Prefix with - for descending. Examples: title_number, -last_updated",
  }),
  fields: z.string().optional().openapi({
    description: "Comma-separated list of metadata fields to include. Use 'metadata' for all metadata without body.",
  }),
});

/** CFR document listing filter parameters. */
export const cfrFilterSchema = paginationSchema.extend({
  title_number: z.coerce.number().int().optional(),
  chapter_number: z.string().optional(),
  part_number: z.string().optional(),
  agency: z.string().optional(),
  status: z.string().optional(),
  legal_status: z.string().optional(),
  sort: z.string().optional().default("identifier"),
  fields: z.string().optional(),
});

/** FR document listing filter parameters. */
export const frFilterSchema = paginationSchema.extend({
  document_type: z.enum(["rule", "proposed_rule", "notice", "presidential_document"]).optional(),
  agency: z.string().optional(),
  date_from: z.string().optional().openapi({
    description: "Publication date range start (YYYY-MM-DD)",
  }),
  date_to: z.string().optional().openapi({
    description: "Publication date range end (YYYY-MM-DD)",
  }),
  effective_date_from: z.string().optional(),
  effective_date_to: z.string().optional(),
  sort: z.string().optional().default("-publication_date"),
  fields: z.string().optional(),
});
