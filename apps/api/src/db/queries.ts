import type Database from "better-sqlite3";

/** Options for building a filtered, sorted, paginated query. */
export interface QueryOptions {
  source: string;
  filters: Record<string, unknown>;
  sort: string;
  limit: number;
  offset: number;
  cursor?: string | undefined;
}

/** Result from a paginated query. */
export interface QueryResult {
  rows: Record<string, unknown>[];
  total: number | null;
  limit: number;
  offset: number;
  hasMore: boolean;
  cursorUsed: boolean;
  nextCursor?: string | undefined;
}

interface ParsedSort {
  field: string;
  descending: boolean;
  clause: string;
}

/** Columns allowed in WHERE clauses — prevents SQL injection via column names. */
const FILTERABLE_COLUMNS = new Set([
  "title_number",
  "chapter_number",
  "part_number",
  "status",
  "legal_status",
  "positive_law",
  "document_type",
  "agency",
  "publication_date",
  "effective_date",
]);

/** Columns allowed in ORDER BY clauses. */
const SORTABLE_COLUMNS = new Set([
  "identifier",
  "title_number",
  "section_number",
  "last_updated",
  "publication_date",
  "document_number",
]);

/** Default columns returned in listing queries (no body content). */
const LISTING_COLUMNS =
  "id, identifier, source, display_title, title_number, title_name, " +
  "section_number, section_name, chapter_number, chapter_name, " +
  "part_number, part_name, legal_status, positive_law, status, " +
  "currency, last_updated, document_number, document_type, " +
  "publication_date, agency, content_hash, format_version";

/**
 * Parse a sort string (e.g., "-publication_date") into a validated ORDER BY clause.
 * Falls back to "identifier ASC" for invalid sort fields.
 */
function parseSortParam(sort: string): ParsedSort {
  const descending = sort.startsWith("-");
  const requestedField = descending ? sort.slice(1) : sort;

  if (!SORTABLE_COLUMNS.has(requestedField)) {
    return {
      field: "identifier",
      descending: false,
      clause: "identifier ASC",
    };
  }

  return {
    field: requestedField,
    descending,
    clause: `${requestedField} ${descending ? "DESC" : "ASC"}`,
  };
}

function getNextCursorValue(row: Record<string, unknown> | undefined, field: string): string | undefined {
  const value = row?.[field];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
}

/**
 * Build and execute a filtered, sorted, paginated query.
 *
 * All filter values are parameterized — no string interpolation into SQL.
 * Column names are validated against allowlists.
 */
export function queryDocuments(db: Database.Database, options: QueryOptions): QueryResult {
  const { source, filters, sort, limit, offset } = options;
  const conditions: string[] = ["source = @source"];
  const params: Record<string, unknown> = { source };

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (key === "date_from") {
      conditions.push("publication_date >= @date_from");
      params.date_from = value;
    } else if (key === "date_to") {
      conditions.push("publication_date <= @date_to");
      params.date_to = value;
    } else if (key === "effective_date_from") {
      conditions.push("effective_date >= @effective_date_from");
      params.effective_date_from = value;
    } else if (key === "effective_date_to") {
      conditions.push("effective_date <= @effective_date_to");
      params.effective_date_to = value;
    } else if (key === "positive_law") {
      conditions.push("positive_law = @positive_law");
      params.positive_law = value ? 1 : 0;
    } else {
      if (!FILTERABLE_COLUMNS.has(key)) continue;
      conditions.push(`${key} = @${key}`);
      params[key] = value;
    }
  }

  const whereClause = conditions.join(" AND ");
  const parsedSort = parseSortParam(sort);
  const useCursor = Boolean(options.cursor);

  // Cursor pagination: skip past the last-seen sort key
  if (useCursor && options.cursor) {
    const op = parsedSort.descending ? "<" : ">";
    conditions.push(`${parsedSort.field} ${op} @cursor`);
    params.cursor = options.cursor;
  }

  const cursorWhereClause = conditions.join(" AND ");

  if (useCursor) {
    const dataSql =
      `SELECT ${LISTING_COLUMNS} FROM documents WHERE ${cursorWhereClause} ` +
      `ORDER BY ${parsedSort.clause} LIMIT @limit_plus_one`;

    const rows = db.prepare(dataSql).all({
      ...params,
      limit_plus_one: limit + 1,
    }) as Record<string, unknown>[];

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      rows: pageRows,
      total: null,
      limit,
      offset: 0,
      hasMore,
      cursorUsed: true,
      nextCursor: hasMore ? getNextCursorValue(pageRows.at(-1), parsedSort.field) : undefined,
    };
  }

  // Offset pagination keeps returning total counts for traditional page UIs.
  const countSql = `SELECT count(*) as total FROM documents WHERE ${whereClause}`;
  const { total } = db.prepare(countSql).get(params) as { total: number };

  const dataSql =
    `SELECT ${LISTING_COLUMNS} FROM documents WHERE ${whereClause} ` +
    `ORDER BY ${parsedSort.clause} LIMIT @limit OFFSET @offset`;

  const rows = db.prepare(dataSql).all({ ...params, limit, offset }) as Record<string, unknown>[];

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
    cursorUsed: false,
  };
}
