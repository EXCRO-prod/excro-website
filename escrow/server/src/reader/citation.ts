// Citation verifier (spec 04 A.5): "every field must cite a quote; the quote must exist verbatim
// (fuzzy >= 0.95) in the OCR text at the cited page. No quote, no field." This kills hallucinated
// conditions. It is deliberately independent of the extractors: a bug in a reader (or a future
// LLM-backed one) that invents a quote is still caught here.
const normaliseWhitespace = (s: string): string => s.replace(/\s+/g, " ").trim();

/** Verbatim (after whitespace normalisation) or near-verbatim substring match. */
export function verifyCitation(quote: string, sourceText: string): boolean {
  const q = normaliseWhitespace(quote);
  if (!q) return false;
  const t = normaliseWhitespace(sourceText);
  if (t.includes(q)) return true;
  return fuzzyContains(q, t) >= 0.95;
}

/** Best-match ratio of `quote` against any equal-length window of `text` (Levenshtein-based). Only
 * invoked on the (rare) non-exact path, so an O(n*m) scan per window is acceptable at document scale. */
function fuzzyContains(quote: string, text: string): number {
  if (quote.length > text.length) return similarity(quote, text);
  let best = 0;
  // Slide in steps to bound cost; a real near-miss (OCR noise) still lands within a few characters.
  const step = Math.max(1, Math.floor(quote.length / 20));
  for (let i = 0; i + quote.length <= text.length; i += step) {
    const window = text.slice(i, i + quote.length);
    const s = similarity(quote, window);
    if (s > best) best = s;
    if (best >= 1) break;
  }
  return best;
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, dp[j]!, dp[j - 1]!);
      prevDiag = temp;
    }
  }
  return dp[b.length]!;
}
