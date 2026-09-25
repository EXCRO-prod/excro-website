// Fuzzy person/entity name comparison used across PAN, Aadhaar, penny-drop and e-sign names.
// Returns 0..1. Callers decide the pass threshold (Config.nameMatchPassPct); below it means ops review, never auto-reject.
const TITLES = new Set(["MR", "MRS", "MS", "DR", "SHRI", "SMT", "SRI", "KUM", "M/S", "MS."]);

export function tokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.,'"()]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !TITLES.has(t));
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length]![b.length]!;
}

const tokenMatches = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.length === 1 || b.length === 1) return a[0] === b[0]; // initial vs full name
  return Math.max(a.length, b.length) > 3 && editDistance(a, b) <= 1;
};

export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const pool = [...tb];
  let matched = 0;
  for (const t of ta) {
    const i = pool.findIndex((u) => tokenMatches(t, u));
    if (i >= 0) {
      matched++;
      pool.splice(i, 1);
    }
  }
  return matched / Math.max(ta.length, tb.length);
}
