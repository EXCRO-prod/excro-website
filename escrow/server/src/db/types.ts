// Plain SQL behind one interface so PGlite (local) and PostgreSQL (Azure) are interchangeable.
//
// Gotcha: a `bigint`/`int8` column (sequences, audit_events.seq) comes back as a JS `number` from
// PGlite but as a `string` from node-postgres (which avoids precision loss above 2^53). Always
// coerce explicitly (String(...) or Number(...)) rather than assuming either shape.
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Multi-statement SQL without parameters (migrations). */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  /** Runs fn in one transaction: commits on return, rolls back on throw. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
