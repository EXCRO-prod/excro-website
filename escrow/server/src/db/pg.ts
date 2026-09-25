import pg from "pg";
import type { Db, Queryable } from "./types.js";

// Real PostgreSQL through the same interface. Not exercised in local tests (PGlite is the default);
// exercise it against Azure PostgreSQL Flexible Server before relying on it.
export function openPg(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString });
  const wrap = (c: pg.Pool | pg.PoolClient): Queryable => ({
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await c.query(sql, params);
      return r.rows as T[];
    },
    async exec(sql: string) {
      await c.query(sql);
    },
  });
  return {
    ...wrap(pool),
    async tx<T>(fn: (q: Queryable) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(wrap(client));
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
