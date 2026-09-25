# 01 · Product requirements

## Problem
Two parties who don't trust each other need money held neutrally and released only when agreed things happen. Today in India that means a bank escrow set up over weeks with paper mandates, or trusting the other side. The platforms that digitised this (CastlerX, Escrowpay) cover the happy path well. The hard parts are still manual: deciding what happens when a deal fails, and checking that evidence is real.

## Positioning
**"Escrow that already knows what happens when things go wrong."**
Three differentiators, in order of defensibility:
1. **Distribution**: Excro's existing corporate banking clients (YES, Axis, IDFC, ICICI integrations). Escrow is an extra step inside payments they already make.
2. **Pre-agreed failure playbook + verified evidence.** Failed deals settle by rule, not by argument.
3. **Agreement intelligence**: a growing, consented clause library with outcome data (which clauses led to disputes). This compounds over time; competitors can't copy the data.

## Personas
| Persona | Example | Job to be done | Must feel |
|---|---|---|---|
| Deal initiator (buyer) | SME procurement head, Ludhiana | Pay an advance to a new supplier without losing it | "My money is at a bank, not with an app" |
| Counterparty (seller) | Component maker, Bengaluru | Get paid on delivery without chasing | "The rules can't be changed after I ship" |
| Tenant admin | Excro client finance team / marketplace / broker | Run many escrows, templates, approvals | Control and reporting |
| Excro ops reviewer | Excro staff | Clear review queues, handle exceptions | Clear queue, full evidence |
| Bank ops | Escrow agent bank | Verify instructions match mandate | Signed, reconcilable instructions |
| Arbitrator (external) | ODR partner | Decide disputes | Complete evidence bundle |

## Core journeys (MVP)
0. **Party setup (spec 13):** number of parties and roles → every party signs in with an Excro account → KYC verified by Excro for every party before anyone signs or funds.
1. **Create (two flows, spec 12):** (A) upload an agreement signed elsewhere → integrity checks → extraction → gap flags with options → both accept → e-sign Escrow Release Addendum; or (B) draft on Excro → collaborative review → both accept → Protean e-stamp + e-sign. No legal review by Excro in either flow.
2. **Fund:** virtual escrow account issued → deposit → remitter matched → funded.
3. **Perform:** evidence uploaded/pulled → verified → conditions satisfied → timers run.
4. **Settle:** outcome resolved → 24h objection window → payout instructions → reconciliation → closed.
5. **Fail/dispute:** failure rule fires or dispute raised → partial freeze → settlement or award → execute.

## Feature list (MoSCoW for Phase 1)
**Must:** agreement upload + extraction with citations; field-level confirmation by both parties; playbook from clause library; money-map validator; e-sign and e-stamp via Protean; virtual account per deal on one bank; remitter matching; courier verification via one aggregator + delivery OTP fallback; GST e-invoice check; timers & reminders; waterfall payouts with maker–checker overrides; disputes stage 1 (in-platform settlement); audit trail export; WhatsApp/email/SMS notifications; tenant branding (logo, colours, domain).
**Should:** template-based agreement generation; ODR partner hand-off; bulk deals via API; tenant approval workflows.
**Could:** two-sided escrow (seller performance security); JV profit-split conditions; Hindi UI.
**Won't (Phase 1):** cross-border; UAE; consumer C2C; crypto; interest-bearing escrow.

## Non-functional requirements
| Area | Requirement |
|---|---|
| Money correctness | 0 unreconciled rupees at daily close; every payout traceable to schedule clause + evidence |
| Extraction accuracy | ≥ 98% field-level precision on confirmed fields (after HITL); ≥ 90% recall of conditions before HITL on golden set |
| Availability | 99.9% for web/API; payouts may queue but never duplicate |
| Latency | Extraction ≤ 90 s for 20-page PDF; webhook-to-status ≤ 60 s |
| Security | See spec 07; pen-test before first live rupee |
| Residency | India data in India; UAE data in UAE (spec 06) |
| Accessibility | WCAG 2.2 AA; works on 360 px Android |
| Languages | English first; Hindi and Arabic (RTL) by Phase 3 |

## Success metrics
- Time from agreement upload to signed schedule: median < 30 min.
- % of deals closed with no human intervention by Excro: > 85%.
- Disputes per 100 funded deals, and share resolved by pre-agreed rule vs arbitration.
- Counterparty-to-initiator conversion (the viral loop): % of invited counterparties who later start their own deal.
- Gross take rate and bank cost per deal.
