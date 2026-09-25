# 13 · Parties, Excro accounts and KYC

A deal can have **two or more parties**. Every party must have an **Excro account** and **Excro-verified KYC**. Deal setup starts by fixing who the parties are.

## Step 0 of every deal: party setup
1. The initiator states **how many parties** and each party's **role** (below). Minimum 2, maximum 10 in Phase 1.
2. Each party is invited by mobile + email. They must sign in to (or create) an **Excro account**; nobody acts on a deal as a guest.
3. A **party readiness panel** shows every party's account and KYC status. It stays at the top of the deal until everyone is green.
4. **KYC gate** (setting `KYC_GATE`):
   - `before_signing` (**default, recommended**): parties with verified accounts can view terms, upload or draft the agreement, and resolve gaps while KYC completes in parallel. **No one can e-sign, and no escrow account is opened, until every party's KYC is verified.**
   - `before_drafting`: nothing beyond party setup is possible until every party's KYC is verified.
   Either way, **no money moves and nothing is signed** without verified KYC for every party.
5. The party list is fixed when drafting or upload starts. Adding or removing a party later restarts the flow from step 0 (all confirmations and acceptances are reset).

## Roles
| Role | Money | Signs | Confirms conditions | Example |
|---|---|---|---|---|
| **Payer** | Deposits a share into escrow; receives refunds | Yes | Yes | Buyer; co-buyers; JV partners contributing capital |
| **Payee** | Receives releases | Yes | Yes | Seller; JV partners receiving profit share |
| **Payer-payee** | Both | Yes | Yes | JV partner who contributes and receives |
| **Fee payee** | Receives a fixed or % amount from another party's payout | Yes | Yes | Broker commission paid out of the seller's release |
| **Verifier** | None | Signs sign-offs only | Only the conditions assigned to them | Inspection agency; CA certifying JV profits |
| **Observer** | None | No | No (read-only) | Lender financing the buyer; logistics partner |
Verifiers and observers still need an Excro account. Verifiers need KYC (individual, or entity + signatory if a firm). Observers need account verification only (mobile + email).

## Consent rules with N parties
- **Every condition and every gap fix** needs a tick from every party who signs. An edit by any party resets everyone else's tick for that item.
- **Signing:** every signing party signs through Protean. Signing order is configurable (default: payers first).
- **Funding:** each payer has a **deposit share** in the schedule. A credit counts only if the sender matches that payer's verified bank account. The deal is funded when every share is in. If any payer misses the deadline, the deal lapses and those who paid are refunded to source.
- **Disputes:** any party with money in an outcome can raise one. Only the disputed amount is frozen. A settlement needs acceptance from every party whose payout changes.
- **Money map:** payout lines are per party. The validator checks every outcome sums to the total of all deposits, with no negative line and no payout to a party without a payee role.

## Phase 1 template roles (goods sale with inspection)
Buyer (payer, 1–3 co-buyers with deposit shares), Seller (payee, exactly 1), Broker (fee payee, optional, commission from seller's release), Inspector (verifier, optional, owns the inspection sign-off condition), Observer (optional). Joint-venture profit splits are Phase 2 (`computed_split`), but the data model supports them from day one.

## KYC provider
KYC checks run through **Protean or another authorised KYC service provider** behind one `KycProvider` adapter (PAN, Aadhaar, GSTIN, MCA, penny-drop, screening). Excro receives results and stores references, not raw identity data beyond what the review needs.
- Aadhaar: use whichever route the provider is licensed for Excro's use case (authentication through the provider's licence, or DigiLocker/offline e-KYC). Confirm in the provider contract that Excro's use is covered.
- Whatever the route, **the full Aadhaar number is never stored by Excro**: masked last 4 digits + provider reference only.

## KYC: individuals
| Check | How | Pass rule |
|---|---|---|
| Mobile | OTP | Verified |
| Email | OTP / magic link | Verified |
| PAN | PAN verification API (Protean / NSDL or KYC vendor) | Valid, name returned |
| Aadhaar | **Offline verification only**: DigiLocker or Aadhaar paperless offline e-KYC through a licensed KYC vendor | Name and DOB match PAN (fuzzy), photo retained |
| Bank account (payers and payees) | Penny-drop | Account holder ≈ PAN name |
| Screening | Sanctions / PEP / adverse media via vendor | No unresolved hit |
| Liveness (optional, above value threshold) | Selfie match to Aadhaar photo | Match |

**Aadhaar handling:** online Aadhaar authentication by private entities needs government/UIDAI approval under the 2025 amendment process. Excro does not have that approval, so it uses offline verification through a vendor. Excro **never stores the full Aadhaar number**: only the vendor reference, masked number (last 4 digits) and the verified name/DOB/photo. Aadhaar eSign through Protean is separate and allowed because Protean is the licensed eSign provider.

## KYC: entities
| Entity type | Entity checks | Documents | Who else is KYC'd |
|---|---|---|---|
| Private / public company | Entity PAN; **GSTIN** (active, legal name ≈ PAN name); CIN on MCA (status active, directors list) | Certificate of incorporation, MOA/AOA, **board resolution or authorisation letter for the signatory**, registered address proof | Signatory (full individual KYC); **beneficial owners ≥ 10%** (declaration + PAN) |
| LLP | Entity PAN; GSTIN; LLPIN on MCA | LLP agreement, authorisation for signatory | Signatory; designated partners; beneficial owners |
| Partnership firm | Entity PAN; GSTIN | Partnership deed, authority letter signed by partners | Signatory; partners with beneficial interest |
| Proprietorship | Not a separate legal entity: **proprietor's individual KYC** | Two business proofs: GSTIN and/or Udyam, shop & establishment | Proprietor |
| Trust / society | Entity PAN; registration | Trust deed / bye-laws, resolution | Signatory; trustees |

- **GSTIN is required where the entity is GST-registered.** An entity below the GST threshold may use Udyam or shop & establishment registration plus a declaration. This needs ops review, not an automatic fail.
- **Signatory authority check:** the signatory must be a director or designated partner on MCA, *or* named in the uploaded resolution or authorisation letter. Aadhaar eSign only proves who the individual is; this check proves they can bind the entity.
- **Entity bank account:** penny-drop must return the entity's name, not the signatory's.
- **Screening** covers the entity, directors or partners, signatory and beneficial owners.

## KYC lifecycle and review
- States: `not_started → in_progress → pending_review → verified(expiry) | rejected`, plus `expired`.
- Automatic checks run first; document checks (resolutions, deeds, address proofs) go to the **Excro ops review queue**. High-risk cases (screening hit, mismatches, non-GST entities) need maker–checker approval.
- **KYC belongs to the Excro account, not the deal.** A verified party can join future deals without repeating KYC until expiry or a trigger (name change, signatory change, screening hit, document expiry). Re-KYC periodicity is set by Excro compliance.
- A party whose KYC expires or is revoked mid-deal: payouts to that party are held, other parties are notified, and nothing else about the deal changes.

## Data handling
- KYC documents are stored in a separate encrypted container with customer-managed keys, access-logged, and visible only to Excro ops with a KYC role.
- Deal screens show KYC **status and masked identifiers**, never documents, to other parties.
- Retention follows Excro compliance's policy under PMLA record-keeping (to be confirmed by counsel).

## API additions
`POST /v1/deals` now requires `parties[]` {role, label, invitee mobile/email, depositShareBps?, feeRule?}.
`GET /v1/deals/{id}/readiness`: per party {account, kyc_status, missing[]}.
`POST /v1/kyc/individual`, `POST /v1/kyc/entity`, `POST /v1/kyc/{id}/documents`, `GET /v1/kyc/me`.
Ops: `GET /v1/ops/kyc-queue`, `POST /v1/ops/kyc/{id}:approve|reject` (maker–checker when high-risk).
