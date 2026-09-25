import { mkdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Db, Queryable } from "./types.js";

/** Embedded Postgres. `dir` undefined = in-memory (tests). */
export async function openPglite(dir?: string): Promise<Db> {
  // PGlite's own directory creation isn't recursive, so `server/.data/pglite` fails on a first
  // run where `.data` doesn't exist yet either. Create the full path ourselves first.
  if (dir) await mkdir(dir, { recursive: true });
  const pg = dir ? new PGlite(dir) : new PGlite();
  await pg.waitReady;
  const wrap = (c: { query: PGlite["query"]; exec: PGlite["exec"] }): Queryable => ({
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await c.query<T>(sql, params);
      return r.rows;
    },
    async exec(sql: string) {
      await c.exec(sql);
    },
  });
  const root = wrap(pg);
  return {
    ...root,
    tx: (fn) => pg.transaction((t) => fn(wrap(t as unknown as PGlite))),
    close: () => pg.close(),
  };
}
