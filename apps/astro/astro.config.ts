import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { lexbuildLight, lexbuildDark } from "./src/lib/shiki-themes";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: lexbuildLight,
        dark: lexbuildDark,
      },
      defaultColor: false,
    },
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Avoid bundling Shiki's ~5MB WASM grammar files into the SSR bundle.
      // This is for the runtime Shiki singleton in lib/shiki.ts (legal content).
      // Astro's built-in markdown Shiki (Content Collections) uses a separate path.
      external: ["shiki"],
    },
  },
});
