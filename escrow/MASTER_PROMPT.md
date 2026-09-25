# Master prompt for Claude Code: Excro Conditional Release (local build)

Paste everything below the line into Claude Code, opened in the `Digital Escrow` folder.

---

You are the lead engineer building **Excro Conditional Release**, a digital escrow platform where funds are held by a bank and released only when conditions in a signed Release Schedule are met. You are building the **Phase 1 India MVP to run fully on my laptop**. We will deploy to Azure later, so keep every cloud dependency behind an interface, but do not call Azure now.

## 0. Read first, then plan
1. Read `CLAUDE.md` (non-negotiable rules) and every file in `specs/` (00 → 14). The most important are `specs/13-parties-and-kyc.md`, `specs/12-agreement-flows.md` and `specs/03-condition-release-engine.md`.
2. Open `Excro-Spec-v0.1-and-Mockup.html` for the intended screens and money math (40 laptops × ₹46,000 example).
3. Reply with a short build plan mapped to the milestones below, the folder layout, and any spec ambiguity you found. **Wait for my "go" before writing code.**

## 1. Local stack (no Docker, no cloud accounts needed)
- Node 22 + TypeScript, npm workspaces: `server/` and `web/`. One command runs everything: `npm install && npm run dev`.
- Server: Fastify 5, zod, `tsx` for dev, `vitest` for tests.
- Database: **PGlite** (embedded Postgres, stored in `server/.data/`) by default; if `DATABASE_URL` is set, use real Postgres through the same `Db` interface. Plain SQL, no ORM. Same schema works on Azure PostgreSQL later.
- Web: Vite + React 19 + TypeScript, plain CSS using the palette and IBM Plex fonts from the mockup. Vite proxies `/api` to the server.
- `.env.example` documents every variable. Everything works with no env vars set (mock mode).

## 2. Adapters (interface + mock now, real later)
| Adapter | Mock behaviour | Real later |
|---|---|---|
| `EscrowBank` | Virtual account per deal; credits and payouts recorded in a `mock_bank_txns` table; payout **idempotent on idemKey** and rejects bad signatures or insufficient balance | Excro's YES/Axis/IDFC/ICICI connectors |
| `Signer` (payout instructions) | HMAC with a local secret | Azure Key Vault Managed HSM |
| `CourierApi` | In-memory registry; simulator sets picked_up / delivered / lost | Shiprocket / Delhivery |
| `ESignProvider`, `EStampProvider` | **Protean** mock: request id, per-signer completion returning signer name + txn id; e-stamp quote/purchase with a clearly labelled mock duty table | Protean eSignPro live (keys in `.env`; leave a TODO skeleton, don't guess their API) |
| `KycProvider` | Mobile/email OTP (code shown in dev console), PAN, Aadhaar (mock returning name/DOB/masked number only), GSTIN, MCA CIN/LLPIN (mock directors list), penny-drop, sanctions screening. Mock rules: format checks + name matching; a few seeded names trigger a screening hit or name mismatch so review paths can be tested | **Protean** or another authorised KYC provider (PAN, Aadhaar, GSTIN, MCA, penny-drop, screening) behind this one interface |
| `Reader` (agreement extraction) | Deterministic **rule-based reader** (regex over numbered clauses) returning value + clause number + verbatim quote | Azure OpenAI / Foundry reader(s), enabled by env vars |
| `Clock` | Real time + a dev-only offset the simulator can advance | System time |
| `Notifier` | Writes to the deal timeline + console | Azure Communication Services |

## 3. Parties, Excro accounts and KYC (spec 13): build this first
- A deal has **2–10 participants** with roles: payer, payee, payer_payee, fee_payee, verifier, observer. Step 0 of every deal: initiator sets the number of parties and roles, then invites each by mobile + email.
- **Every participant must have an Excro account** (mobile + email OTP verified). No guest actions.
- **KYC belongs to the party and is reused across deals.** Individual: mobile, email, PAN, Aadhaar via the KYC provider (store only masked last 4 + provider ref, never the full number), penny-drop for anyone who pays or receives money, screening. Entity (company, LLP, partnership, trust): entity PAN, GSTIN (or Udyam + declaration → ops review), MCA record, documents (incorporation, MOA/AOA or deed, board resolution/authorisation), **signatory full individual KYC + authority check** (director on MCA or named in the resolution), beneficial owners ≥ 10%, entity bank account in the entity's name. Proprietorship = proprietor's individual KYC + two business proofs.
- KYC states: not_started → in_progress → pending_review → verified(expiry) | rejected | expired. Document checks go to an **ops KYC queue**; high-risk cases need maker–checker.
- **KYC gate** env `KYC_GATE=before_signing` (default) or `before_drafting`. Either way, no e-sign and no escrow account until every participant is verified. A **readiness panel** on each deal shows every party's account and KYC status.
- **N-party consent:** every signing participant ticks every condition and gap fix; any edit resets everyone else's tick. All signers sign via Protean (configurable order, payers first). Each payer funds its deposit share from its own verified account; the deal is funded only when all shares arrive; a missed share lapses the deal and refunds whoever paid. Settlements need every affected party.
- Phase 1 goods template roles: 1–3 buyers (payers with deposit shares), 1 seller (payee), optional broker (fee payee: % of seller release), optional inspector (verifier who owns an inspection sign-off), optional observer.

## 3b. Domain rules to implement exactly
- **Money:** integer paise; rates in basis points; BigInt for multiplication; round half-to-even.
- **Release Schedule params** (deal type `goods_sale_inspection`): unitCount, unitPriceMinor, valueMinor, fundingDays, dispatchDays, dispatchExtensionDays, maxExtensions, promisedDeliveryDate, deliveryLongStopDays, inspectionDays, silenceRule='accept', ldBpsPerDay, ldCapBps, buyerCancelFeeBps, returnDays, returnShippingPaidBy, noShipRule, lostInTransitRule (reship_or_refund | refund), reshipDays, objectionWindowHours=24, sellerPincode, deliveryPincode, consigneeName, weightMinKg/MaxKg, disputeSeat.
- **Excro commission plan (spec 14):** amount none | fixed | bps (with optional min/max), **default none (0)**; GST inclusive/exclusive; payer participants with shares; collection `at_funding` | `at_release` | `outside_escrow`; on failure `refundable` | `non_refundable` | `refundable_except_fixed`. Validator rejects `at_funding` + `refundable`. Commission withdrawals are ordinary signed payout instructions to Excro's fee account. Zero fee = no fee lines at all.
- **Waterfall** (must match the mockup): deposit per payer = deal share + commission share when collected from escrow. Outcomes: release_all(daysLate), partial(acceptedUnits, daysLate), dispute(undisputed, disputed), reject_all, refund_full(reason), buyer_cancel. Late deduction = min(value × rate × days, value × cap) on accepted value, paid to buyer. Seller fee share is collected only up to the seller's payout.
- **Money-map validator:** enumerate every outcome at extremes (0 and max late days; 1, n/2, n−1 accepted units). Payout lines are **per participant** (co-buyers refunded pro-rata to deposit share; broker paid from the seller line). Signing is blocked unless every row sums exactly to total deposits with no negative line and no payout to a non-payee.
- **Test fixtures that must pass:** (a) commission 0.5% GST-inclusive, split 50/50, at release, refundable; 38 of 40 accepted, 1 day late → seller ₹17,34,660, buyer refund ₹92,000, buyer late deduction ₹8,740, Excro ₹9,200, total ₹18,44,600. (b) Same deal with default zero commission → deposit ₹18,40,000, seller ₹17,39,260, buyer ₹92,000 + ₹8,740. (c) Every example row in the spec 14 table.

## 4. The two agreement flows (spec 12)
**Flow A: signed outside, uploaded.** Excro does **no legal review**.
1. Upload PDF or .txt → sha256, text (use `unpdf` for PDFs), integrity checks: signature present (PDF `/ByteRange` + `/Sig`; say "present, not validated locally"), same copy confirmed by the other party (hash), party names found in the text, stamp duty details found (advisory flag only, never blocks).
2. Extraction → fields with confidence: **green** only if two readers agree and the citation quote is found verbatim; one reader = **amber**; disagreement, missing quote, or units × price ≠ total = **red**. Red fields block signing; amber must be opened before ticking.
3. Both buyer and seller tick **each** field (no accept-all). An edit by one party resets the other's tick.
4. Gap findings from a clause library: **mandatory** (silence rule, late-deduction cap, seller never ships, lost in transit, delivery long-stop, returns, buyer cancellation), **conflict** (e.g. "paid within 30 days of invoice"), **advisory** (weight range, force majeure). Each has 2–3 options with library IDs. Resolved only when both parties pick the same option. Mandatory unresolved = deal stops.
5. Ops review gate if value ≥ threshold (env) or any red field was resolved by edit.
6. Generate **Escrow Release Addendum** (plain-language schedule + accepted fixes + precedence clause + "Excro has not reviewed the underlying agreement" + schedule sha256) → Protean e-sign by both → schedule frozen (`signed`).

**Flow B: drafted on Excro.**
1. Intake form (parties, goods, price, dates, pincodes, playbook choices prefilled with library defaults).
2. Draft agreement from the clause template; the playbook answers are clauses inside the agreement.
3. **Round-trip check:** run the rule reader on the draft; the re-extracted params must equal the intake params, or the draft is rejected.
4. Both parties accept the same version (hash); any edit resets both. Signing-authority advisory for companies.
5. Protean e-stamp (quote + purchase) → e-sign agreement with the Release Schedule as annex → `signed`.

## 5. After signing (both flows)
- Open virtual account; funding deadline = signedAt + fundingDays.
- **Bank credit:** remitter must match buyer's verified account, otherwise return to source. Overpayment excess returned. Underpayment waits; at the deadline it's refunded and the deal lapses.
- Funded → dispatch deadline. Seller submits a slip (text/OCR) → read courier, AWB, pincodes, consignee, weight, date → checks: AWB unused across deals, consignee ≈ buyer, origin = seller pincode, destination = agreed pincode, weight in range, booking date ≥ funding date → confirm with courier API.
- Missed dispatch → buyer may cancel (refund_full) or grant an extension (up to maxExtensions). Lost → reship window, else refund. No delivery by promised date + long-stop → refund_full.
- Delivered (courier status) → inspection window. Buyer: accept all / reject k units (→ return window; seller confirms receipt → partial; seller contests → dispute with k units held) / reject all. Silence at deadline → release_all.
- Outcome → `release_pending` for objectionWindowHours; either party can dispute → funds held; stage-1 settlement: one party proposes a split of the held pool, the other accepts. Stage-2 award: Ops maker enters, a **different** Ops checker approves.
- Payout execution: one instruction per payee line, idemKey = sha256(deal|outcome|payee|scheduleSha), signed, sent to bank, double-entry ledger (`escrow_cash`, `deal_liability`, `payable:*`), then `settled` → `closed`.
- Every state change appends to an audit **hash chain** in the same transaction. Endpoint to verify the chain.
- Reconciliation endpoint: ledger escrow balance vs bank VA balance per deal.
- Timer tick every 5 s (and after the simulator advances the clock) evaluates all deadlines.

## 6. Web app
- Header: **acting-as switcher** listing every participant of the open deal plus Excro Ops, so one person can demo all sides.
- Account sign-up/sign-in (OTP mock), "My KYC" wizard (individual or entity), ops KYC review queue.
- New deal starts with **party setup** (count, roles, invites, deposit shares, broker fee, **Excro commission plan**) and a readiness panel.
- Deals list → deal page with a status timeline and the next action for the current role.
- Screens: start (Flow A upload / Flow B intake), integrity + field review with source quote highlight, gaps with options per party, money map table (all outcomes, "Balanced" badge), addendum/agreement preview, Protean signing (mock), escrow account and funding status, dispatch slip submission with verification checklist, inspection actions, outcome and payout table, dispute/settlement, ledger + audit.
- **Simulator drawer** (dev only): bank deposit (right amount / short / over / wrong remitter), courier status (picked up / delivered / lost), advance clock by hours/days, "Load sample agreement".
- Mobile-friendly at 360 px; readable in light and dark.

## 7. Samples to include
`server/samples/supply-agreement-nirmal-kavya.txt` and `courier-slip-delhivery.txt` (copies are in this folder). The sample agreement deliberately lacks a silence rule, late-deduction cap, no-ship refund, lost-in-transit rule, long-stop, returns and cancellation (7 mandatory gaps), and contains the "30 days of invoice" conflict. Flow A on it must produce exactly those findings.

## 8. Milestones (stop after each; show me tests + a screenshot or curl output)
0. **Accounts, parties, KYC:** account OTP, individual and entity KYC with mocks, ops queue with maker–checker, readiness and KYC gate. Tests: signing blocked until all parties verified; full Aadhaar never persisted (grep the DB in a test).
1. **Domain core:** money, schedule schema, waterfall, money map, state machine. Vitest: fixture above, every money-map row balances, rounding, caps.
2. **Persistence + audit + ledger:** PGlite/pg `Db`, schema, hash chain, ledger, recon.
3. **Reader + gaps + template:** rule reader on the sample agreement, citation verifier, gap findings, Flow B template **round-trip test**.
4. **API for Flows A and B through signing** (Protean mock).
5. **Funding → dispatch → delivery → inspection → outcome → payouts**, timers, disputes, maker-checker.
6. **Web UI** with role switcher and simulator.
7. **E2E script** (`npm run e2e`) driving the API through: a 3-party deal (buyer company with signatory + UBO, seller company, broker individual at 1% of seller release) blocked at signing until the broker's KYC is approved; Flow A happy path with 38/40 accepted and 1 day late (asserting the fixture payouts), Flow B with silence → release_all, a wrong-remitter return, a missed dispatch → refund, and a payout replay proving idempotency.
8. README: how to run, how to demo in 5 minutes, what's mocked, what changes for Azure.

## 9. Guardrails
- No LLM or AI call anywhere in the engine, waterfall or payout path.
- Never invent legal wording beyond the clause library in the specs; if something is missing, ask me.
- A tenant API key or Ops user can never tick, sign or accept on a party's behalf.
- Never persist a full Aadhaar number anywhere (DB, logs, files); KYC documents are never shown to other deal parties.
- Don't add features outside Phase 1 (no UAE, no cross-border, no multi-currency).
- Keep files small and named by domain; comment *why*, not *what*.
