import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Position within its section for sidebar ordering. Lower = higher. */
    order: z.number().default(999),
    /** Optional badge shown next to the title in the sidebar (e.g., "New", "Beta"). */
    badge: z.string().optional(),
    /** If true, page is excluded from the sidebar but still routable. */
    hidden: z.boolean().default(false),
  }),
});

export const collections = { docs };
