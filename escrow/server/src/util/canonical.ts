import { createHash } from "node:crypto";

/** Deterministic JSON: sorted keys, bigint as decimal string, undefined dropped. Used for every hash we anchor. */
export function canonicalize(v: unknown): unknown {
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, x]) => [k, canonicalize(x)]),
    );
  }
  return v;
}

export const canonicalStringify = (v: unknown): string => JSON.stringify(canonicalize(v));

export const sha256Hex = (s: string): string => createHash("sha256").update(s).digest("hex");
