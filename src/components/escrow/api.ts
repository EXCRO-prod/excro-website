// Thin fetch client for the escrow API (proxied by the website at /api/escrow) plus the "acting as" identity store.
// One browser holds several signed-in sessions so a single person can demo every side of a deal
// (master prompt §6). Tokens live in localStorage: dev/demo convenience only, wrapped in try/catch.

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public detail?: unknown) {
    super(message);
  }
}

export interface Identity {
  key: string;
  kind: "party" | "staff";
  label: string;
  token: string;
}

const STORE = "excro.identities";
const CURRENT = "excro.current";

function read<T>(k: string, d: T): T {
  if (typeof window === "undefined") return d; // server render: no storage, sessions load on the client
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function write(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private window: sessions just won't survive a reload */
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
let identities: Identity[] = read<Identity[]>(STORE, []);
let currentKey: string | null = read<string | null>(CURRENT, null);

const emit = () => listeners.forEach((l) => l());

export const session = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  all: () => identities,
  current: (): Identity | undefined => identities.find((i) => i.key === currentKey),
  add(i: Identity): void {
    identities = [...identities.filter((x) => x.key !== i.key), i];
    currentKey = i.key;
    write(STORE, identities);
    write(CURRENT, currentKey);
    emit();
  },
  switchTo(key: string | null): void {
    currentKey = key;
    write(CURRENT, currentKey);
    emit();
  },
  remove(key: string): void {
    identities = identities.filter((i) => i.key !== key);
    if (currentKey === key) currentKey = identities[0]?.key ?? null;
    write(STORE, identities);
    write(CURRENT, currentKey);
    emit();
  },
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const token = opts.token === undefined ? session.current()?.token : opts.token;
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`/api/escrow${path}`, { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const e = (data ?? {}) as { error?: string; message?: string; detail?: unknown };
    // A session that expired is dropped so the switcher doesn't keep offering a dead identity.
    if (res.status === 401 && token) {
      const dead = identities.find((i) => i.token === token);
      if (dead) session.remove(dead.key);
    }
    throw new ApiError(res.status, e.error ?? "http_error", e.message ?? res.statusText, e.detail);
  }
  return data as T;
}

// ---- response shapes (mirroring server/src) ----------------------------------------------

export type Role = "payer" | "payee" | "payer_payee" | "fee_payee" | "verifier" | "observer";
export const ROLES: Role[] = ["payer", "payee", "payer_payee", "fee_payee", "verifier", "observer"];
export type KycStatus = "not_started" | "in_progress" | "pending_review" | "verified" | "rejected" | "expired";

export interface Account { id: string; mobile: string; email: string; mobileVerified: boolean; emailVerified: boolean }

export interface KycView {
  partyId: string;
  legalName: string;
  status: KycStatus;
  panMasked: string | null;
  aadhaarMasked: string | null;
  checks: { kind: string; status: string }[];
  bankAccounts: { id: string; accountMasked: string; ifsc: string; status: string; holderName: string | null }[];
  reviewOpen: boolean;
}

export type EntityType = "company" | "llp" | "partnership" | "proprietorship" | "trust";
export interface EntitySummary { partyId: string; type: EntityType; legalName: string; status: KycStatus }
export interface EntityKycView {
  partyId: string;
  type: EntityType;
  legalName: string;
  status: KycStatus;
  panMasked: string | null;
  gstinMasked: string | null;
  gstRegistered: boolean;
  regNo: string | null;
  beneficialOwners: { fullName: string; pan: string; sharePct: number }[];
  documents: { kind: string; status: string }[];
  bankAccounts: { id: string; accountMasked: string; ifsc: string; status: string }[];
  reviewOpen: boolean;
}

export interface DealSummary { id: string; status: string; flow: string | null; myLabel: string; createdAt: string }
export interface Participant {
  id: string;
  ref: string;
  role: Role;
  label: string;
  signs: boolean;
  signOrder: number;
  depositShareBps: number;
  feeRule: { bps: number; fixedMinor: string };
  isInitiator: boolean;
  joined: boolean;
  isMe: boolean;
  mobileMasked: string;
  emailMasked: string;
}
export interface Deal {
  id: string;
  status: string;
  flow: "A" | "B" | null;
  kycGate: "before_signing" | "before_drafting";
  partiesLocked: boolean;
  commission: {
    amount: { type: "none" } | { type: "fixed"; minor: string } | { type: "bps"; bps: number; minMinor?: string; maxMinor?: string };
    gst: { mode: string; rateBps: number };
    payers: { participantId: string; shareBps: number }[];
    collect: string;
    onFailure: string;
  };
  createdAt: string;
  participants: Participant[];
}
export interface ReadinessRow {
  participantId: string;
  label: string;
  role: Role;
  joined: boolean;
  kycStatus: KycStatus;
  panMasked: string | null;
  aadhaarMasked: string | null;
  missing: ("account" | "kyc" | "bank_account")[];
  ready: boolean;
}
export interface Readiness { dealId: string; kycGate: string; participants: ReadinessRow[]; allReady: boolean }
export interface AuditRow { seq: number; dealId: string | null; actor: string; action: string; detail: Record<string, unknown>; at: string; eventHash: string }

export interface QueueItem {
  reviewId: string;
  partyId: string;
  legalName: string;
  risk: "normal" | "high";
  reasons: string[];
  panMasked: string | null;
  aadhaarMasked: string | null;
  createdAt: string;
  proposal: { requestId: string; makerId: string; decision: string } | null;
}
export interface MakerCheckerRequest { id: string; kind: string; subjectRef: string; payload: Record<string, unknown>; reasonCode: string; note: string | null; makerId: string }
export const REASON_CODES = ["KYC_MISMATCH_CLEARED", "SCREENING_FALSE_POSITIVE", "SCREENING_CONFIRMED", "DOCUMENT_INADEQUATE", "IDENTITY_NOT_ESTABLISHED", "OTHER_WITH_NOTE"] as const;

export interface OutboxMessage { id: string; channel: string; to: string; subject: string; body: string; at: string }
