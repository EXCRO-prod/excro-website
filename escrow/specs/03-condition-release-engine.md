# 03 · Condition & release engine

## Principles
- Event-sourced: every input is an event (`bank.credit`, `courier.status`, `party.action`, `timer.fired`). The engine applies the schedule to events and emits commands. Same events → same result (replayable).
- No LLM in this service. No network calls except to the ledger/outbox.
- Timers live in Durable Functions (one orchestration per deal); timer firing emits `timer.fired` into Service Bus with deal-scoped session IDs, so each deal's events are processed strictly in order.

## Condition catalogue
| Type | Satisfied when | Evidence adapter | Fallback |
|---|---|---|---|
| funding | credit ≥ required, remitter matched | bank | statement recon |
| dispatch | pickup confirmed at seller pincode with valid tracking number | courier | handover OTP |
| delivery | "delivered" at agreed pincode + POD | courier | delivery OTP + geo-photo |
| inspection | buyer accepts all/some/none by deadline | party action | silence rule |
| document | doc uploaded + validated (IRN/GSTIN/e-way bill; B/L; CoO) | gst / trade | counterparty acceptance |
| third_party_signoff | named verifier signs | signoff link | replacement verifier by both |
| milestone | date reached / mutual confirm | clock / parties | — |
| computed_split | figures approved, formula applied | parties / CA | CA certificate |
| manual | both parties confirm in-app | parties | dispute |

## Evaluation loop
1. Receive event → load signed schedule + deal state (optimistic lock on version).
2. Update condition states; recompute which outcome triggers are true.
3. If an outcome is triggered → compute waterfall → state `release_pending` → schedule objection timer.
4. On objection timer: if no dispute → create PayoutInstructions (outbox) → orchestrator.
5. Append audit events in the same transaction.

## Multiple parties
Payout lines are per participant. Payers each have a deposit share; refunds go back pro-rata to each payer's source account. Fee payees are paid out of the payee line named in their fee rule. The validator checks totals across all participants (spec 13).

## Waterfall (deterministic)
```
deposit
 − Excro commission (per commission plan, spec 14; default zero)
 − deductions (formula, capped, evidence-backed) → beneficiary
 − statutory (configured per deal by CA; never inferred)
 = payouts; assert Σ == deposit (else halt + page on-call)
```

## Release orchestrator
- Reads outbox; signs instruction JSON with HSM key (ES256); sends to bank adapter with idempotency key.
- Status polling + bank callback; retries with exponential backoff; never re-creates an instruction, only re-sends the same one.
- Manual override screen: maker proposes, checker approves; both MFA; reason code; limits by role.
- Daily reconciliation: bank VA statement vs ledger per deal; any variance → deal flagged, payouts for that bank paused.

## Disputes
- Freeze = move disputed amount to `held` sub-ledger; rest continues.
- Stage 1 settlement: structured proposal (split by payee) e-signed by both → executes as a new outcome version.
- Stage 2: export evidence bundle (PDF + JSON + hash chain proof) to ODR partner; award ingested → ops verifies → maker–checker → execute.
