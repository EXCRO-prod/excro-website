# 02 · Domain model & state machine

## Entities
| Entity | Key fields | Notes |
|---|---|---|
| Tenant | id, cell (IN/AE/SA), branding, fee_plan, templates[] | Excro clients, marketplaces, brokers; "direct" tenant for Excro's own users |
| Account | id, mobile_verified, email_verified, created_at | Every party must have one (spec 13) |
| Party | id, account_id, type (individual/company/llp/partnership/proprietorship/trust), legal_name, kyc_status, kyc_expiry, kyc_refs, verified_bank_accounts[], signatory_party_id, beneficial_owners[] | KYC belongs to the party, reused across deals |
| DealParticipant | deal_id, party_id, role (payer/payee/payer_payee/fee_payee/verifier/observer), label, deposit_share_bps, fee_rule, signs (bool), sign_order | 2–10 per deal; fixed once drafting starts |
| Deal | id, tenant_id, cell, type, currency, value_minor, status, schedule_id | One deal = one escrow virtual account |
| Agreement | id, deal_id, source (upload/generated), blob_uri (immutable), sha256, pages, signature_check, stamp_check | Original file never mutated |
| Addendum | id, deal_id, version, gap_resolutions[], schedule_sha256, signed_pdf_uri, protean_txn_ids | Flow A only |
| GapFinding | id, deal_id, kind (mandatory/conflict/advisory), cite, options[], status, accepted_by[] | |
| Extraction | id, agreement_id, model_version, fields[], each {value, confidence, citation{page, bbox, quote}} | Draft only |
| ReleaseSchedule | id, deal_id, version, json, sha256, status (draft/proposed/signed/superseded), signatures[] | Signed version is the only thing the engine reads |
| Condition | id, schedule_id, type, owner_party, evidence_spec, deadline, on_timeout, depends_on[] | See catalogue in 03 |
| Outcome | id, schedule_id, trigger, payouts[] {payee, formula, cap}, fees[] | Terminal states of the money map |
| Evidence | id, condition_id, kind, source (api/upload/otp), payload_uri, verification{checks[], result} | Immutable blob + verification record |
| EscrowAccount | id, deal_id, bank, virtual_account_no, ifsc/iban, status | Provisioned via bank adapter |
| LedgerEntry | id, deal_id, debit_acct, credit_acct, amount_minor, ref | Double-entry; per-deal sub-ledger |
| PayoutInstruction | id, deal_id, outcome_id, payee_account, amount_minor, idem_key, signature, status | Signed with HSM key |
| Dispute | id, deal_id, amount_frozen_minor, stage, settlement_id/award_id | |
| AuditEvent | seq, deal_id, actor, action, before_hash, after_hash, prev_event_hash, event_hash | Hash chain, anchored daily |

## Release Schedule JSON (v1)
```json
{
  "schema": "excro.release-schedule/1",
  "deal": {"id": "EX-2609-0142", "type": "goods_sale_inspection", "currency": "INR", "value_minor": 184000000},
  "participants": [
    {"party": "pty_nirmal", "role": "payer", "label": "Buyer", "deposit_share_bps": 10000, "signs": true},
    {"party": "pty_kavya", "role": "payee", "label": "Seller", "signs": true},
    {"party": "pty_agent", "role": "fee_payee", "label": "Broker", "fee_rule": "0.01 * seller_release", "signs": true}
  ],
  "commission": {"amount": {"type": "bps", "bps": 50}, "gst": "inclusive", "payers": [{"party": "pty_nirmal", "share_bps": 5000}, {"party": "pty_kavya", "share_bps": 5000}], "collect": "at_release", "on_failure": "refundable"},
  "deposit": {"required_minor": 184460000, "payer": "buyer", "deadline": "2026-09-23T18:00:00+05:30",
              "remitter_must_match": true},
  "conditions": [
    {"id": "c_dispatch", "type": "dispatch", "owner": "seller", "after": "funded", "within": "P5D",
     "evidence": {"courier": "any_supported", "consignee_match": "buyer", "dest_pincode": "141003",
                  "weight_kg": {"min": 80, "max": 120}},
     "on_timeout": {"action": "buyer_option_cancel", "extension": {"max": 1, "days": 3, "consent": "both"}}},
    {"id": "c_delivery", "type": "delivery", "depends_on": ["c_dispatch"], "promised_by": "2026-09-30",
     "on_timeout": {"action": "outcome", "outcome": "o_refund_full", "after": "P10D"}},
    {"id": "c_inspect", "type": "inspection", "owner": "buyer", "depends_on": ["c_delivery"], "within": "P3D",
     "unit": {"count": 40, "price_minor": 4600000}, "silence": "accept"}
  ],
  "deductions": [{"id": "d_ld", "name": "late_delivery", "formula": "0.005 * days_late * accepted_value",
                  "cap": "0.05 * accepted_value", "beneficiary": "buyer", "evidence": "c_delivery.delivered_at"}],
  "outcomes": [
    {"id": "o_release", "trigger": "c_inspect.accepted_all"},
    {"id": "o_partial", "trigger": "c_inspect.accepted_some"},
    {"id": "o_refund_full", "trigger": "c_dispatch.cancelled | delivery.lost"},
    {"id": "o_buyer_cancel", "trigger": "buyer.cancel_before_dispatch", "cancellation_fee": "0.02 * deal.value"}
  ],
  "objection_window": "PT24H",
  "long_stop": "2027-03-31",
  "dispute": {"stage1_days": 7, "odr_provider": "TBD", "seat": "Bengaluru"},
  "rounding_beneficiary": "seller",
  "clause_refs": {"c_dispatch": {"library_id": "LIB-GS-DISP-003", "agreement_cite": "§4.2 p3"}}
}
```

## Deal state machine
Intake splits into Flow A (uploaded) and Flow B (drafted); see spec 12 for their pre-signing states. After `signed`, both flows follow the machine below.

`draft → extracted → in_review → proposed → signed → account_open → funded → in_performance → release_pending → settled → closed`
Side exits: `account_open → lapsed`; `funded|in_performance|release_pending → disputed → settled`; `in_performance → refunding → closed`; any → `frozen_legal` (court/regulator order).
Transitions are guarded; each guard is a pure function tested by table-driven tests.

## Money-map validator (must pass before `proposed → signed`)
For every outcome O and every reachable combination of deduction inputs at their caps and at zero:
`Σ payouts(O) + Σ fees(O) + Σ refunds(O) == deposit.required_minor`, all terms ≥ 0.
Validator enumerates: each outcome × {no deduction, max deduction} × {0, 1, n−1, n accepted units}. Any failure blocks signing and names the outcome.
