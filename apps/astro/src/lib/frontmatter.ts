import matter from "gray-matter";
import type { ContentFrontmatter } from "./types";

/** Parse a raw .md file into frontmatter and body. */
export function parseFrontmatter(raw: string): {
  frontmatter: ContentFrontmatter;
  body: string;
} {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as ContentFrontmatter,
    body: content,
  };
}
