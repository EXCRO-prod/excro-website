// Deal state machine (specs 02 + 12 + 13). Each guard is a pure function of a plain context
// object, so the whole table is testable without a database. A guard returns null when the
// transition is allowed, or the reason it is blocked (shown to users and written to audit).

export const DEAL_STATES = [
  "draft",
  // Flow A: uploaded outside
  "uploaded", "integrity_checked", "extracted", "gaps_open", "gaps_resolved", "addendum_ready",
  // Flow B: drafted on Excro
  "intake", "drafting", "in_review", "final_accepted", "stamping",
  // both flows
  "signing", "signed",
  "account_open", "funded", "in_performance", "release_pending", "disputed", "refunding", "settled",
  "closed", "lapsed", "frozen_legal",
] as const;
export type DealState = (typeof DEAL_STATES)[number];
export type Flow = "A" | "B";

export interface GuardContext {
  kycGate: "before_signing" | "before_drafting";
  /** Every participant that must be verified (signers, payers, payees, verifiers) has verified KYC. */
  allKycVerified: boolean;
  openMandatoryGaps: number;
  unresolvedRedFields: number;
  /** Every signing party has ticked every field, gap fix and the commission plan, on the same version hash. */
  everySignerTickedAll: boolean;
  opsReviewRequired: boolean;
  opsReviewDone: boolean;
  /** Result of validateMoneyMap(...).balanced. */
  moneyMapBalanced: boolean;
  roundTripOk: boolean;
  stampPurchased: boolean;
  allSigned: boolean;
  fullyFunded: boolean;
  fundingDeadlinePassed: boolean;
  outcomeTriggered: boolean;
  refundTriggered: boolean;
  disputeRaised: boolean;
  objectionWindowElapsed: boolean;
  settlementExecuted: boolean;
  payoutsSettled: boolean;
  legalOrderReceived: boolean;
}

type Guard = (c: GuardContext) => string | null;
const need = (ok: boolean, why: string): string | null => (ok ? null : why);
const all = (...gs: Guard[]): Guard => (c) => gs.map((g) => g(c)).find((r) => r !== null) ?? null;

const kyc: Guard = (c) => need(c.allKycVerified, "every participant needs verified KYC");
const moneyMap: Guard = (c) => need(c.moneyMapBalanced, "money map is not balanced or terms are still unset");
const ops: Guard = (c) => need(!c.opsReviewRequired || c.opsReviewDone, "Excro ops review is pending");
const open: Guard = () => null;

export interface Transition {
  from: DealState;
  to: DealState;
  flow?: Flow;
  guard: Guard;
}

const t = (from: DealState, to: DealState, guard: Guard = open, flow?: Flow): Transition => ({ from, to, guard, ...(flow ? { flow } : {}) });

const PRE_SIGNING: DealState[] = ["draft", "uploaded", "integrity_checked", "extracted", "gaps_open", "gaps_resolved", "addendum_ready", "intake", "drafting", "in_review", "final_accepted", "stamping"];
const NOT_TERMINAL: DealState[] = DEAL_STATES.filter((s) => s !== "closed" && s !== "frozen_legal");

export const TRANSITIONS: Transition[] = [
  // Flow A
  t("draft", "uploaded", (c) => (c.kycGate === "before_drafting" ? need(c.allKycVerified, "KYC gate: verify every participant before drafting") : null), "A"),
  t("uploaded", "integrity_checked", open, "A"),
  t("integrity_checked", "extracted", open, "A"),
  t("extracted", "gaps_open", open, "A"),
  t("gaps_open", "gaps_resolved", all((c) => need(c.openMandatoryGaps === 0, "mandatory gaps are still open"), (c) => need(c.everySignerTickedAll, "not every signer has ticked every item")), "A"),
  t("gaps_resolved", "addendum_ready", all(moneyMap, (c) => need(c.unresolvedRedFields === 0, "red fields block signing"), ops), "A"),
  t("addendum_ready", "signing", all(kyc, moneyMap, (c) => need(c.everySignerTickedAll, "not every signer has ticked every item")), "A"),
  // Flow B
  t("draft", "intake", (c) => (c.kycGate === "before_drafting" ? need(c.allKycVerified, "KYC gate: verify every participant before drafting") : null), "B"),
  t("intake", "drafting", open, "B"),
  t("drafting", "in_review", (c) => need(c.roundTripOk, "draft does not round-trip to the schedule"), "B"),
  t("in_review", "final_accepted", all(moneyMap, (c) => need(c.everySignerTickedAll, "not every signer accepted the same version"), ops), "B"),
  t("final_accepted", "stamping", kyc, "B"),
  t("stamping", "signing", all(kyc, (c) => need(c.stampPurchased, "e-stamp not purchased")), "B"),
  // Both flows
  t("signing", "signed", all(kyc, moneyMap, (c) => need(c.allSigned, "not every signing party has signed"))),
  t("signed", "account_open", kyc),
  t("account_open", "funded", (c) => need(c.fullyFunded, "not every payer's share has arrived")),
  t("account_open", "lapsed", (c) => need(c.fundingDeadlinePassed && !c.fullyFunded, "funding deadline has not passed")),
  t("funded", "in_performance"),
  t("in_performance", "release_pending", (c) => need(c.outcomeTriggered, "no outcome has triggered")),
  t("in_performance", "refunding", (c) => need(c.refundTriggered, "no failure rule has fired")),
  t("release_pending", "settled", (c) => need(c.objectionWindowElapsed && !c.disputeRaised, "objection window still open or a dispute is raised")),
  t("funded", "disputed", (c) => need(c.disputeRaised, "no dispute raised")),
  t("in_performance", "disputed", (c) => need(c.disputeRaised, "no dispute raised")),
  t("release_pending", "disputed", (c) => need(c.disputeRaised, "no dispute raised")),
  t("disputed", "settled", (c) => need(c.settlementExecuted, "no signed settlement or verified award executed")),
  t("refunding", "closed", (c) => need(c.payoutsSettled, "refund payouts not settled")),
  t("settled", "closed", (c) => need(c.payoutsSettled, "payouts not settled")),
  t("lapsed", "closed"),
  // Adding or removing a party restarts from step 0 (spec 13); side effects (reset ticks) live with the caller.
  ...PRE_SIGNING.filter((s) => s !== "draft").map((s) => t(s, "draft")),
  // Court or regulator order can freeze a deal from any live state.
  ...NOT_TERMINAL.map((s) => t(s, "frozen_legal", (c) => need(c.legalOrderReceived, "no legal order recorded"))),
];

export interface TransitionCheck {
  ok: boolean;
  reason?: string;
}

export function canTransition(from: DealState, to: DealState, ctx: GuardContext, flow?: Flow): TransitionCheck {
  const candidates = TRANSITIONS.filter((x) => x.from === from && x.to === to && (!x.flow || x.flow === flow));
  if (candidates.length === 0) return { ok: false, reason: `no transition ${from} -> ${to}${flow ? ` in flow ${flow}` : ""}` };
  const reasons: string[] = [];
  for (const c of candidates) {
    const r = c.guard(ctx);
    if (r === null) return { ok: true };
    reasons.push(r);
  }
  return { ok: false, reason: reasons[0] };
}

export function nextStates(from: DealState, flow?: Flow): DealState[] {
  return [...new Set(TRANSITIONS.filter((x) => x.from === from && (!x.flow || x.flow === flow)).map((x) => x.to))];
}

/** A context where every guard passes; tests flip one field at a time. */
export function openContext(): GuardContext {
  return {
    kycGate: "before_signing",
    allKycVerified: true,
    openMandatoryGaps: 0,
    unresolvedRedFields: 0,
    everySignerTickedAll: true,
    opsReviewRequired: false,
    opsReviewDone: false,
    moneyMapBalanced: true,
    roundTripOk: true,
    stampPurchased: true,
    allSigned: true,
    fullyFunded: true,
    fundingDeadlinePassed: true,
    outcomeTriggered: true,
    refundTriggered: true,
    disputeRaised: false,
    objectionWindowElapsed: true,
    settlementExecuted: true,
    payoutsSettled: true,
    legalOrderReceived: true,
  };
}
