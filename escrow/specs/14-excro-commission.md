# 14 · Excro commission (platform fee)

Every deal has a **commission plan**, set during deal setup (step 0) and shown to every party before they accept anything. It becomes part of the signed Release Schedule. **Default: zero.**

## Settings
| Setting | Options | Default |
|---|---|---|
| Amount | `none` · fixed amount · % of deal value (bps) · % with a minimum and/or maximum | `none` (0) |
| GST | exclusive (18% added on top) · inclusive | exclusive |
| Who pays | any participant(s), with shares that add up to 100% | — |
| How it's collected | **A.** withdrawn from escrow at funding · **B.** withdrawn from escrow at release · **C.** paid outside escrow (Excro invoice / payment link) | B |
| If the deal fails | non-refundable · refundable · refundable except a fixed setup portion | refundable |
Deal setup is completed by the initiator and Excro (or the tenant's pricing plan). Every signing party sees and ticks the commission plan like any other condition.

## Rules the engine enforces
1. **Commission leaves escrow only as a line in the signed schedule.** Excro's fee account is named in the three-way escrow agreement as a permitted beneficiary, and each withdrawal is a normal signed payout instruction with its own idempotency key. There is no other path for Excro to take money from an escrow account.
2. **Deposit includes the fee only when collection is A or B.** Each paying party's deposit = their deal share + their fee share (+ GST). With C, deposits are deal value only.
3. **A (at funding) must be non-refundable.** Once withdrawn, the money has left escrow and can't fund a refund. The validator rejects A + refundable, and the schedule must say plainly that the fee is kept if the deal fails.
4. **B (at release) follows the outcome.** Release or partial release: fee withdrawn with the payouts. Full refund: fee refunded to its payer(s) if refundable; if non-refundable, withdrawn from the payer's refund.
5. **Fee capped by what the payer receives or deposited.** A payee's fee share can never exceed their payout in any outcome. If it would, the shortfall is waived; the money map shows the waiver.
6. **C (outside escrow) never blocks money movement.** Unpaid invoices are chased by finance, not by holding parties' funds. Optionally, a tenant can require C to be paid before signing.
7. **Money map:** fee lines appear in every outcome row according to collection method and refundability, and every row must still sum to total deposits.
8. **Zero fee:** no fee line, no fee account, no GST invoice.

## Accounting and tax (confirm with Excro's CA)
- GST invoice issued to each paying party for their share when the fee is collected (A/B) or invoiced (C).
- Payers deducting TDS on the fee: Excro receives net and books TDS receivable. Rate and section to be confirmed by the CA; the engine takes TDS as a configured deduction, never inferred.
- Ledger: `escrow_cash → payable:excro_fee → excro_fee_account`, the same as any payout.

## Examples (deal value ₹18,40,000)
| Plan | Deposit (buyer) | Release outcome | Seller never ships |
|---|---|---|---|
| None (default) | ₹18,40,000 | Seller ₹18,40,000 | Buyer refund ₹18,40,000 |
| 0.5% GST-inclusive, split 50/50, collected at release, refundable | ₹18,44,600 | Seller ₹18,35,400 · Excro ₹9,200 | Buyer refund ₹18,44,600 · Excro ₹0 |
| 0.5% GST-inclusive, buyer pays, collected at funding, non-refundable | ₹18,49,200 | Seller ₹18,40,000 · Excro ₹9,200 (already withdrawn at funding) | Buyer refund ₹18,40,000 · Excro ₹9,200 |
| 0.5% + 18% GST, seller pays, outside escrow | ₹18,40,000 | Seller ₹18,40,000; Excro invoices seller ₹10,856 | Buyer refund ₹18,40,000 |
