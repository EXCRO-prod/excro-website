import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Db } from "./types.js";

const dir = join(fileURLToPath(new URL(".", import.meta.url)), "migrations");

/** Applies numbered .sql files once each, in order, each in its own transaction. */
export async function migrate(db: Db): Promise<string[]> {
  await db.exec("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(join(dir, f), "utf8");
    await db.tx(async (q) => {
      await q.exec(sql);
      await q.query("insert into schema_migrations(name) values ($1)", [f]);
    });
    applied.push(f);
  }
  return applied;
}
