import type { HttpError } from "../errors.js";
import type { Db, Queryable } from "./types.js";

export type TxOutcome<T> = { ok: true; value: T } | { ok: false; error: HttpError };

/**
 * A plain throw rolls the transaction back, which would also undo things that must persist on failure
 * (failed-OTP attempt counters, audit of a refused action). Return `{ ok:false }` to commit those side
 * effects first; the error is thrown only after the commit.
 */
export async function txThenThrow<T>(db: Db, fn: (q: Queryable) => Promise<TxOutcome<T>>): Promise<T> {
  const out = await db.tx(fn);
  if (!out.ok) throw out.error;
  return out.value;
}

export const ok = <T>(value: T): TxOutcome<T> => ({ ok: true, value });
export const fail = (error: HttpError): TxOutcome<never> => ({ ok: false, error });
