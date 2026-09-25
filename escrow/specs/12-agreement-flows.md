# 12 · Agreement flows: uploaded vs drafted on Excro

Deals enter Excro in one of two ways. From signing onwards, both flows are identical: escrow account → funding → conditions → release.

| | Flow A: Signed outside, uploaded | Flow B: New agreement, drafted on Excro |
|---|---|---|
| Who wrote the agreement | The parties / their lawyers | Excro drafts from templates + clause library; parties edit |
| Excro legal review | **None.** Excro doesn't assess validity or fairness | None beyond lawyer-approved templates; optional paid review by Excro's legal partner |
| What the AI does | Extracts conditions; flags gaps and conflicts with escrow mechanics; offers options to fix them | Drafts terms; resolves gaps *inside* the draft while it is being written |
| What gets e-signed on Excro | **Escrow Release Addendum** (gap fixes + Release Schedule) | **Agreement + Release Schedule annex** in one signing ceremony |
| E-stamping | Parties' responsibility (Excro flags if no stamp found) | Done through Protean e-stamp before e-sign |

## Why Flow A still needs an e-signed addendum
The accepted gap fixes change how money moves. A button click inside the app is weak evidence if the original agreement says something different. If a party later disputes it, the signed agreement wins over an in-app click, and the bank will not act on an instruction without signed authority. So the accepted fixes and the Release Schedule become a short **Escrow Release Addendum** that both parties e-sign via Protean. It carries a precedence clause (wording to be drafted by Excro's lawyer), in substance: *"For the holding and release of escrowed funds only, this Addendum governs. It does not otherwise amend the Agreement."*

## Before either flow
Party setup and KYC gate (spec 13): number of parties and roles fixed, every party has an Excro account, and every party is KYC-verified before signing (or before drafting, if `KYC_GATE=before_drafting`). "Both parties" below means **every signing party**.

## Flow A: step by step
1. **Upload the executed copy.** PDF preferred; scans accepted.
2. **Integrity checks** (not a legal review). Each result is shown to both parties:
   | Check | Method | If it fails |
   |---|---|---|
   | Is it signed? | Validate embedded PDF digital signatures (certificate chain, document not modified after signing); for scans, detect signature blocks on the execution page | Flag: "No signatures detected". Both parties must confirm this is the executed version |
   | Same copy for both? | Second party confirms the file (hash) or uploads their copy; text diff if hashes differ | Differences shown clause by clause; must be resolved before continuing |
   | Parties match? | Names/entities in the agreement vs KYC-verified parties and signatories | Flag mismatch (e.g. group company signed) |
   | Stamped? | Detect e-stamp certificate or stamp-paper details | Flag only: *"No stamp duty details found. Unstamped agreements may need stamping before they can be relied on in court. Speak to your lawyer."* Never block. |
   | Dates sensible? | Execution date, deal dates, expiry | Flag expired or impossible dates |
3. **Extraction** of conditions with citations and HITL confirmation (spec 04 A–B).
4. **Gap scan.** Three kinds of finding, each with 2–3 options from the clause library plus a plain-language explanation:
   - **Mandatory gaps**: without these the money map can't be completed, so the deal can't proceed until both pick an option. Examples: no rule for buyer silence after delivery; no refund rule if the seller never ships; deductions with no cap; no long-stop date. (Excro's commission is not an agreement gap: it is set in deal setup, spec 14.)
   - **Conflicts with escrow mechanics**: e.g. the agreement says "payment within 30 days of invoice" (not tied to delivery); instalments don't add up to the price; a different bank or account is named; the agreement names a dispute forum the escrow can't follow.
   - **Advisory gaps** (can be marked "not needed" by both): e.g. no inspection standard, no force-majeure clause, no partial-delivery rule when goods are a single unit.
5. **Both parties accept** each finding's resolution. One party's choice is proposed to the other; counter-proposals allowed; each accepted item is locked by hash.
6. **Escrow Release Addendum generated**: a plain-language summary of each condition and outcome, the accepted fixes, the precedence clause, and the Release Schedule hash. A statement that Excro has not reviewed the underlying agreement appears in the addendum and on screen.
7. **E-sign via Protean** (both parties, configurable order) → signed PDF stored (write-once) → Release Schedule status `signed`.
8. → Escrow account creation → funding → …

**Deadlock rule:** if the parties can't agree on a mandatory gap, the deal stops at `in_review`. Excro cannot escrow funds without a complete money map. The UI says so plainly and offers to export the gap list for their lawyers.

## Flow B: step by step
1. **Guided intake**: deal type, parties (KYC-light at this stage), goods/services, price, payment and delivery terms, jurisdiction. Form first, chat assist optional.
2. **Draft**: template + clause variants (spec 04 D). The playbook runs *during* drafting, so every mandatory gap is answered as a clause in the agreement. No separate addendum.
3. **Collaborative review**: both parties see the same draft; comment, propose edits per clause, accept/reject the other side's edits; full version history. Edits to library wording flag the clause as custom → Excro legal review queue (optional paid review, or the parties confirm they've taken their own advice).
4. **Consistency + round-trip check**: the draft is re-extracted and must produce the same Release Schedule; dates, amounts and names must agree across clauses.
5. **Both accept the final version** (locked by hash; any later edit resets both acceptances).
6. **Signing authority**: for companies, the signatory's authority (board resolution or authorisation letter) is uploaded or confirmed. Missing = advisory flag, mandatory above the tenant's value threshold.
7. **E-stamp + e-sign via Protean** in one ceremony: e-stamp purchased for the applicable state (who pays is a drafting choice), then both parties e-sign the agreement with the Release Schedule as an annex.
8. Signed PDF + e-stamp certificate + signer certificate details stored (write-once) → escrow account creation → funding → …

## Changing terms after signing (both flows)
Amendment = new addendum version, e-signed by both. It can only change conditions not yet satisfied and outcomes not yet triggered. Funded amounts can't be reduced by amendment, only released or refunded through an outcome.

## Protean integration (e-sign and e-stamp)
Protean eSignPro offers Aadhaar OTP and biometric eSign, DSC signing, multiple signers per workflow, templates, PAN-India e-stamping, APIs and audit trails.
- Adapter: `ProteanSignAdapter` implementing `createSigningRequest(docPdf, signers[], order)`, `status(requestId)`, callback handler, `downloadSigned(requestId)`; `ProteanStampAdapter` for `quote(state, articleType, value)` and `purchase(...)`.
- Store: signed PDF (WORM), transaction/audit IDs from Protean, signer name as returned by eSign vs KYC name (fuzzy match; mismatch → review).
- Always re-validate the signed PDF's signatures ourselves before moving the schedule to `signed`.
- Companies: allow DSC signing for authorised signatories; Aadhaar eSign signs as the individual, so capture authority separately (step B6).
- Keys: Protean API credentials in Key Vault; callbacks verified; sandbox for dev/stage.
- Confirm with Protean: webhook support, rate limits, signer-order support, and e-stamp article coverage for the states we launch in.

## State machine changes (spec 02)
`draft → intake(A|B)`
- A: `uploaded → integrity_checked → extracted → gaps_open → gaps_resolved → addendum_ready → signing → signed`
- B: `intake → drafting → in_review → final_accepted → stamping → signing → signed`
Both continue `signed → account_open → funded → …` exactly as before.
