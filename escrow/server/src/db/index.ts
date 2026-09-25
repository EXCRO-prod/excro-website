import type { Config } from "../config.js";
import { migrate } from "./migrate.js";
import { openPg } from "./pg.js";
import { openPglite } from "./pglite.js";
import type { Db } from "./types.js";

export type { Db, Queryable } from "./types.js";

/** DATABASE_URL set -> real Postgres; otherwise embedded PGlite in `dataDir` (or memory when dataDir is ":memory:"). */
export async function openDb(config: Pick<Config, "databaseUrl" | "dataDir">): Promise<Db> {
  const db = config.databaseUrl ? openPg(config.databaseUrl) : await openPglite(config.dataDir === ":memory:" ? undefined : config.dataDir);
  await migrate(db);
  return db;
}
