/**
 * @lexbuild/core — Shared database schema definitions
 *
 * Provides SQLite schema constants and TypeScript types used by both
 * the CLI ingest command (writer) and the Data API (reader).
 *
 * This module does NOT depend on any SQLite driver — it exports only
 * string SQL statements and TypeScript interfaces.
 */

/** Schema version for migration tracking */
export const SCHEMA_VERSION = 1;

/** SQL to create the documents table */
export const DOCUMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  title_number INTEGER,
  section_number TEXT,
  chapter_number INTEGER,
  part_number TEXT,
  granularity TEXT NOT NULL,
  status TEXT,
  legal_status TEXT NOT NULL,
  positive_law INTEGER,
  currency TEXT,
  last_updated TEXT,
  publication_date TEXT,
  document_type TEXT,
  body TEXT NOT NULL,
  frontmatter TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`;

/** SQL to create the schema metadata table */
export const SCHEMA_META_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
`;

/** SQL statements to create indexes on the documents table */
export const INDEXES_SQL = [
  "CREATE INDEX IF NOT EXISTS idx_documents_source ON documents (source)",
  "CREATE INDEX IF NOT EXISTS idx_documents_identifier ON documents (identifier)",
  "CREATE INDEX IF NOT EXISTS idx_documents_title_number ON documents (title_number)",
  "CREATE INDEX IF NOT EXISTS idx_documents_granularity ON documents (granularity)",
  "CREATE INDEX IF NOT EXISTS idx_documents_source_title ON documents (source, title_number)",
  "CREATE INDEX IF NOT EXISTS idx_documents_publication_date ON documents (publication_date)",
  "CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents (document_type)",
] as const;

/**
 * TypeScript representation of a row in the documents table.
 *
 * Used by the CLI ingest command to write rows and by the Data API to read them.
 * Column types mirror SQLite storage: TEXT maps to string, INTEGER maps to number.
 */
export interface DocumentRow {
  /** Primary key — derived from source + identifier */
  id: string;
  /** Content source: "usc", "ecfr", or "fr" */
  source: string;
  /** Canonical identifier (e.g., "/us/usc/t1/s1") */
  identifier: string;
  /** Human-readable display title */
  title: string;
  /** Title number (e.g., 1 for Title 1) */
  title_number: number | null;
  /** Section number (string — can be alphanumeric) */
  section_number: string | null;
  /** Chapter number */
  chapter_number: number | null;
  /** Part number (string — can be alphanumeric) */
  part_number: string | null;
  /** Output granularity: "section", "chapter", "part", "title", "document" */
  granularity: string;
  /** Section status (e.g., "repealed", "transferred") */
  status: string | null;
  /** Legal provenance status */
  legal_status: string;
  /** Whether this title is positive law (1 = true, 0 = false) */
  positive_law: number | null;
  /** Release point or currency identifier */
  currency: string | null;
  /** ISO date from source generation timestamp */
  last_updated: string | null;
  /** Publication date (FR documents) */
  publication_date: string | null;
  /** Document type (FR documents: rule, proposed_rule, notice, presidential_document) */
  document_type: string | null;
  /** Markdown body content (without frontmatter) */
  body: string;
  /** Raw YAML frontmatter string */
  frontmatter: string;
  /** Estimated token count (characters / 4) */
  token_estimate: number;
  /** ISO timestamp of row creation */
  created_at: string;
  /** ISO timestamp of last row update */
  updated_at: string;
}
