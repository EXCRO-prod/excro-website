import { describe, expect, it } from "vitest";
import { canTransition, DEAL_STATES, nextStates, openContext, TRANSITIONS, type DealState, type Flow, type GuardContext } from "../src/domain/stateMachine.js";

type Case = { from: DealState; to: DealState; flow?: Flow; block: Partial<GuardContext>; reason: RegExp };

// Each row: with everything open the move is allowed; with `block` applied it is refused for `reason`.
const GUARDED: Case[] = [
  { from: "draft", to: "uploaded", flow: "A", block: { kycGate: "before_drafting", allKycVerified: false }, reason: /before drafting/ },
  { from: "draft", to: "intake", flow: "B", block: { kycGate: "before_drafting", allKycVerified: false }, reason: /before drafting/ },
  { from: "drafting", to: "in_review", flow: "B", block: { roundTripOk: false }, reason: /round-trip/ },
  { from: "gaps_open", to: "gaps_resolved", flow: "A", block: { openMandatoryGaps: 1 }, reason: /mandatory gaps/ },
  { from: "gaps_open", to: "gaps_resolved", flow: "A", block: { everySignerTickedAll: false }, reason: /ticked/ },
  { from: "gaps_resolved", to: "addendum_ready", flow: "A", block: { moneyMapBalanced: false }, reason: /money map/ },
  { from: "gaps_resolved", to: "addendum_ready", flow: "A", block: { unresolvedRedFields: 1 }, reason: /red fields/ },
  { from: "gaps_resolved", to: "addendum_ready", flow: "A", block: { opsReviewRequired: true, opsReviewDone: false }, reason: /ops review/ },
  { from: "addendum_ready", to: "signing", flow: "A", block: { allKycVerified: false }, reason: /KYC/ },
  { from: "addendum_ready", to: "signing", flow: "A", block: { moneyMapBalanced: false }, reason: /money map/ },
  { from: "addendum_ready", to: "signing", flow: "A", block: { everySignerTickedAll: false }, reason: /ticked/ },
  { from: "in_review", to: "final_accepted", flow: "B", block: { moneyMapBalanced: false }, reason: /money map/ },
  { from: "in_review", to: "final_accepted", flow: "B", block: { everySignerTickedAll: false }, reason: /same version/ },
  { from: "in_review", to: "final_accepted", flow: "B", block: { opsReviewRequired: true }, reason: /ops review/ },
  { from: "final_accepted", to: "stamping", flow: "B", block: { allKycVerified: false }, reason: /KYC/ },
  { from: "stamping", to: "signing", flow: "B", block: { allKycVerified: false }, reason: /KYC/ },
  { from: "stamping", to: "signing", flow: "B", block: { stampPurchased: false }, reason: /e-stamp/ },
  { from: "signing", to: "signed", block: { allKycVerified: false }, reason: /KYC/ },
  { from: "signing", to: "signed", block: { moneyMapBalanced: false }, reason: /money map/ },
  { from: "signing", to: "signed", block: { allSigned: false }, reason: /signed/ },
  { from: "signed", to: "account_open", block: { allKycVerified: false }, reason: /KYC/ },
  { from: "account_open", to: "funded", block: { fullyFunded: false }, reason: /share/ },
  { from: "account_open", to: "lapsed", block: { fundingDeadlinePassed: false }, reason: /deadline/ },
  { from: "account_open", to: "lapsed", block: { fullyFunded: true }, reason: /deadline/ },
  { from: "in_performance", to: "release_pending", block: { outcomeTriggered: false }, reason: /outcome/ },
  { from: "in_performance", to: "refunding", block: { refundTriggered: false }, reason: /failure rule/ },
  { from: "release_pending", to: "settled", block: { objectionWindowElapsed: false }, reason: /objection/ },
  { from: "release_pending", to: "settled", block: { disputeRaised: true }, reason: /objection|dispute/ },
  { from: "funded", to: "disputed", block: { disputeRaised: false }, reason: /dispute/ },
  { from: "in_performance", to: "disputed", block: { disputeRaised: false }, reason: /dispute/ },
  { from: "release_pending", to: "disputed", block: { disputeRaised: false }, reason: /dispute/ },
  { from: "disputed", to: "settled", block: { settlementExecuted: false }, reason: /settlement/ },
  { from: "refunding", to: "closed", block: { payoutsSettled: false }, reason: /refund payouts/ },
  { from: "settled", to: "closed", block: { payoutsSettled: false }, reason: /payouts/ },
  { from: "signing", to: "frozen_legal", block: { legalOrderReceived: false }, reason: /legal order/ },
];

const okCtx = (extra: Partial<GuardContext> = {}): GuardContext => ({ ...openContext(), disputeRaised: false, ...extra });

describe("guards (table-driven)", () => {
  it.each(GUARDED)("$from -> $to blocked by $block", ({ from, to, flow, block, reason }) => {
    // disputes: the allow-path for *->disputed needs disputeRaised, the settled path needs it false
    // Allow-paths that need a non-default context: raising a dispute; lapsing means not fully funded.
    const base = to === "disputed" ? okCtx({ disputeRaised: true }) : to === "lapsed" ? okCtx({ fullyFunded: false }) : okCtx();
    expect(canTransition(from, to, base, flow)).toEqual({ ok: true });
    const blocked = canTransition(from, to, { ...base, ...block }, flow);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(reason);
  });
});

describe("ungated moves and structure", () => {
  it("ungated transitions are allowed", () => {
    const pairs: [DealState, DealState, Flow?][] = [
      ["draft", "uploaded", "A"], ["uploaded", "integrity_checked", "A"], ["integrity_checked", "extracted", "A"], ["extracted", "gaps_open", "A"],
      ["intake", "drafting", "B"], ["funded", "in_performance"], ["lapsed", "closed"],
    ];
    for (const [f, t, fl] of pairs) expect(canTransition(f, t, okCtx(), fl).ok).toBe(true);
  });

  it("KYC gate before_signing lets parties draft and upload before KYC completes", () => {
    const ctx = okCtx({ allKycVerified: false });
    expect(canTransition("draft", "uploaded", ctx, "A").ok).toBe(true);
    expect(canTransition("draft", "intake", ctx, "B").ok).toBe(true);
    expect(canTransition("gaps_open", "gaps_resolved", ctx, "A").ok).toBe(true);
    expect(canTransition("addendum_ready", "signing", ctx, "A").ok).toBe(false); // ...but nobody signs
    expect(canTransition("signed", "account_open", ctx).ok).toBe(false); // ...and no escrow account opens
  });

  it("flow-specific transitions are not available in the other flow", () => {
    expect(canTransition("draft", "uploaded", okCtx(), "B").ok).toBe(false);
    expect(canTransition("draft", "intake", okCtx(), "A").ok).toBe(false);
    expect(canTransition("draft", "uploaded", okCtx()).ok).toBe(false);
    expect(canTransition("draft", "uploaded", okCtx(), "B").reason).toMatch(/no transition/);
  });

  it("undefined moves are refused", () => {
    expect(canTransition("draft", "signed", okCtx()).ok).toBe(false);
    expect(canTransition("closed", "draft", okCtx()).ok).toBe(false);
    expect(canTransition("funded", "signed", okCtx()).ok).toBe(false);
  });

  it("a party change restarts pre-signing states from draft, never post-signing ones", () => {
    for (const s of ["uploaded", "gaps_open", "in_review", "stamping"] as const) expect(canTransition(s, "draft", okCtx()).ok).toBe(true);
    for (const s of ["signing", "signed", "funded"] as const) expect(canTransition(s, "draft", okCtx()).ok).toBe(false);
  });

  it("closed and frozen_legal have no way out; everything live can be frozen", () => {
    expect(nextStates("closed")).toEqual([]);
    expect(nextStates("frozen_legal")).toEqual([]);
    for (const s of DEAL_STATES.filter((x) => x !== "closed" && x !== "frozen_legal")) expect(nextStates(s, "A")).toContain("frozen_legal");
  });

  it("every transition references known states and none leaves a terminal state", () => {
    for (const t of TRANSITIONS) {
      expect(DEAL_STATES).toContain(t.from);
      expect(DEAL_STATES).toContain(t.to);
      expect(t.from).not.toBe("closed");
    }
  });

  it("nextStates respects flow", () => {
    expect(nextStates("draft", "A")).toContain("uploaded");
    expect(nextStates("draft", "A")).not.toContain("intake");
    expect(nextStates("draft")).toEqual(["frozen_legal"]);
  });
});
