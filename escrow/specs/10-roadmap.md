# 10 · Roadmap & team

Assumes the Speedstar build team (2 people, building with Claude Code) plus Excro providing bank relationships, legal and ops. Dates are targets, not promises. Each phase has exit criteria. The next phase does not start until they're met.

## Phase 0: Foundations (Oct 2026, 4 weeks)
- Legal: opinion on the RBI PA boundary (tech provider vs aggregator); three-way escrow agreement template; clause library v1 for goods sale (lawyer-drafted); e-sign and stamp-duty approach.
- Bank: pick bank #1; sign escrow master account + VA + STP payout mandate; sandbox access.
- Azure: landing zone (subscriptions, policies, networking, Bicep modules), CI/CD, dev/stage.
- AI: annotation guide; first 100 golden agreements annotated.
- Design: clickable mockups for all Phase 1 screens (extend the Spec v0.1 mockup) → approved by Excro.
**Exit:** bank sandbox reachable; legal opinion received; mockups signed off.

## Phase 1: India MVP (Nov 2026 – Feb 2027, ~16 weeks)
Scope: party setup with 2–10 parties and roles, Excro accounts, individual + entity KYC with ops review queue (spec 13); both agreement flows (A: upload signed + gap addendum; B: draft on Excro with Protean e-stamp + e-sign) for B2B goods sale with inspection; one bank; courier aggregator + OTP fallback; e-invoice check; HITL extraction; playbook; money map; disputes stage 1; notifications; white-label basics.
Build order: domain model & engine (with mocks) → ledger + bank adapter → extraction + HITL UI → playbook + validator → evidence adapters → payouts + recon → ops console → hardening + pen-test.
Pilot: 5–10 existing Excro clients, deal cap ₹25 lakh, Excro reviewer on every deal.
**Exit:** 50 funded deals; 0 unreconciled rupees; eval gates green; pen-test criticals closed; median upload-to-signed < 30 min.

## Phase 2: India scale (Mar – Jun 2027)
Service milestones and JV profit-split templates; bank #2; public API + webhooks + embeds; agreement generation from libraries; ODR partner; tenant approval workflows; Hindi; ISO 27001 programme starts.
**Exit:** 3 tenants live via API/white-label; 500 funded deals cumulative; dispute rate and HITL edit rate tracked monthly.

## Phase 3: UAE (Jul – Dec 2027)
Cell AE on UAE North; licensed UAE escrow partner (bank or ADGM/DIFC-regulated agent); India→UAE trade escrow; Dubai resale (MOU deposit) escrow; UAE Pass; Arabic RTL. See spec 11.
**Exit:** partner agreement signed; 25 live UAE deals; regulator-facing documentation complete.

## Phase 4: KSA and deeper trade (2028)
Only if Phase 3 hits exit; Saudi Arabia East cell; licensed KSA partner.

## Team and budget
| Role | Who | When |
|---|---|---|
| Product, design, GTM | Sameep | now |
| Engineering (with Claude Code) | Rajeev | now |
| Fintech/banking lawyer (retainer) | external | Phase 0 |
| Compliance officer (part-time) | Excro/external | Phase 0 |
| Ops reviewer / exceptions | Excro staff | Phase 1 pilot |
| Paralegal annotators (contract) | external | Phase 0–2 |
| Security testers | external firm | end of Phase 1 |
Honest constraint: two engineers-equivalent can build Phase 1. They can't also run 24×7 payout operations. Excro must own ops and on-call for money movement from day one.
