"use client";

// Small shared pieces: formatting, pills, form fields, async action state and app routing.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ApiError, session, type KycStatus, type Role } from "./api";

// ---- formatting ------------------------------------------------------------------------------

/** Paise (integer string) → "₹18,40,000.00". Money never goes through a float on the way in (CLAUDE.md #4). */
// BigInt(…) rather than 100n literals: the website compiles for ES2017. Still exact integer maths.
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

export function inr(minor: string | bigint): string {
  const v = BigInt(minor);
  const neg = v < ZERO;
  const abs = neg ? -v : v;
  const rupees = (abs / HUNDRED).toString();
  const paise = (abs % HUNDRED).toString().padStart(2, "0");
  const last3 = rupees.slice(-3);
  const rest = rupees.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${neg ? "−" : ""}₹${rest ? `${rest},${last3}` : last3}${paise === "00" ? "" : `.${paise}`}`;
}

/** Rupee text typed by a person → paise string, exact (no float). Returns null when not a valid amount. */
export function rupeesToMinor(text: string): string | null {
  const m = text.replace(/[,₹\s]/g, "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return (BigInt(m[1]!) * HUNDRED + BigInt((m[2] ?? "").padEnd(2, "0") || "0")).toString();
}

export const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
export const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export const ROLE_LABEL: Record<Role, string> = {
  payer: "Buyer (payer)",
  payee: "Seller (payee)",
  payer_payee: "Payer and payee",
  fee_payee: "Broker (fee payee)",
  verifier: "Inspector (verifier)",
  observer: "Observer",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Party setup", uploaded: "Agreement uploaded", intake: "Intake", integrity_checked: "Integrity checked",
  extracted: "Extracted", gaps_open: "Gaps open", gaps_resolved: "Gaps resolved", addendum_ready: "Addendum ready",
  drafting: "Drafting", in_review: "In review", final_accepted: "Final accepted", stamping: "Stamping",
  signing: "Signing", signed: "Signed", account_open: "Account open", funded: "Funded", in_performance: "In performance",
  release_pending: "Release pending", disputed: "Disputed", refunding: "Refunding", settled: "Settled", closed: "Closed",
  lapsed: "Lapsed", frozen_legal: "Frozen (legal)",
};

// ---- pills -----------------------------------------------------------------------------------

type Tone = "ok" | "warn" | "bad" | "hold" | "acc" | "mute";
export const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`pill p-${tone}`}>{children}</span>;

const KYC_TONE: Record<KycStatus, [Tone, string]> = {
  not_started: ["mute", "Not started"],
  in_progress: ["warn", "In progress"],
  pending_review: ["hold", "Ops review"],
  verified: ["ok", "Verified"],
  rejected: ["bad", "Rejected"],
  expired: ["bad", "Expired"],
};
export const KycPill = ({ status }: { status: KycStatus }) => <Pill tone={KYC_TONE[status][0]}>{KYC_TONE[status][1]}</Pill>;

export const CheckPill = ({ status }: { status: string }) => (
  <Pill tone={status === "pass" || status === "verified" ? "ok" : status === "review" ? "hold" : status === "fail" || status === "failed" ? "bad" : "mute"}>{status}</Pill>
);

// ---- forms -----------------------------------------------------------------------------------

/** `group` renders a div instead of a label: a label wrapping several buttons would click the first on any label click. */
export function Field({ label, hint, group, children }: { label: string; hint?: ReactNode; group?: boolean; children: ReactNode }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="field">
      <span className="field-l">{label}</span>
      {children}
      {hint && <span className="field-h">{hint}</span>}
    </Tag>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as ApiError;
  const detail = e instanceof ApiError && Array.isArray(e.detail) ? (e.detail as unknown[]) : null;
  return (
    <div className="note bad" role="alert">
      <b>{e.message}</b>
      {e instanceof ApiError && <span className="mono muted"> · {e.code}</span>}
      {detail && (
        <ul className="tight">
          {detail.map((d, i) => (
            <li key={i}>{typeof d === "string" ? d : Array.isArray(d) ? d.join(" or ") : `${(d as { label?: string }).label ?? ""} ${JSON.stringify((d as { missing?: unknown }).missing ?? d)}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Wraps one async action: pending flag, last error, and a runner that clears the error first. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}

/** Loads data for the current identity; `reload` re-fetches after an action changes server state.
 *  State is only set from the async result (never synchronously in the effect), per React's effect rules. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error: unknown }>({ error: null });
  const [tick, setTick] = useState(0);
  const who = useIdentity()?.key;
  useEffect(() => {
    let live = true;
    fn().then(
      (data) => live && setState({ data, error: null }),
      (error: unknown) => live && setState({ data: undefined, error }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, who]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, reload };
}

// Sessions live in the browser only; the server snapshot is "nobody signed in" (the shell waits for mount).
const NO_IDENTITIES: ReturnType<typeof session.all> = [];
export const useIdentity = () => useSyncExternalStore(session.subscribe, session.current, () => undefined);
export const useIdentities = () => useSyncExternalStore(session.subscribe, session.all, () => NO_IDENTITIES);
const noSubscribe = () => () => {};
/** False during server render and hydration, true after: lets the shell render session-dependent UI client-side only. */
export const useMounted = () => useSyncExternalStore(noSubscribe, () => true, () => false);

// ---- routing (the platform lives under /app on the website) --------------------------------

export const APP_BASE = "/app";
export const appHref = (path: string) => (path === "/" ? APP_BASE : `${APP_BASE}${path}`);

/** Navigate within the platform: go("/deals/EX-1") → /app/deals/EX-1. */
export function useGo() {
  const router = useRouter();
  return useCallback((path: string) => router.push(appHref(path)), [router]);
}
