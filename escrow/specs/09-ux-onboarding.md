# 09 · UX, onboarding & customisation

## Principle
Every deal brings a second party who has never heard of Excro. That counterparty's first 3 minutes decide both the deal and the growth loop.

## Counterparty invite flow (target: under 3 minutes to "I've reviewed the terms")
1. WhatsApp/email invite: "Nirmal Traders has invited you to an escrow deal on Excro." (Link, no app install.)
2. Create or sign in to an **Excro account** (mobile + email OTP; mandatory, spec 13) → see the deal summary, the other parties and the conditions. With the default `before_signing` KYC gate, full KYC runs alongside review.
3. Review each condition with source-text highlight; tick or suggest change.
4. KYC must be verified before signing: individual (PAN, Aadhaar offline via DigiLocker, mobile, email, bank) or entity (PAN, GSTIN, MCA, documents, signatory KYC and authority, beneficial owners). Pre-fill from registries wherever possible. KYC is reused across future deals.
5. After closing: "Collect your next payment with Excro" — one-tap to start their own deal with details prefilled (loop).

## Initiator flow
Upload or generate agreement → review extraction → playbook → invite counterparty → e-sign → fund. Progress bar shows the next action and who owes it.

## Trust design
- Always show *where the money is*: bank name, escrow account, balance, last reconciliation time.
- Every automated decision explains itself: "Released because the courier confirmed delivery on 1 Oct 14:05 and no rejection was received in 3 days (§5.1)."
- Plain-language summaries next to legal text; Hindi/Arabic toggles in later phases.

## Tenant customisation (configuration, not custom code)
| Level | What tenants configure |
|---|---|
| Brand | logo, colours, email/WhatsApp sender, custom domain |
| Templates | deal types they allow, default parameters, locked clauses |
| Workflow | internal approvers (maker–checker) before funding/signing, value limits by role |
| Fees | who pays, markups (for brokers/marketplaces reselling Excro) |
| Integrations | webhooks, ERP export (Tally/Zoho via Excro's planned connectors), SSO |
Rule: if a request needs code, it goes into the product for all tenants or it doesn't get built.

## Visibility / growth surfaces (built into the product)
- Public **"Verified by Excro" deal badge** a seller can show buyers (escrow-backed offer).
- Shareable deal-status link for third parties (lender, logistics) with read-only scope.
- Industry template gallery (SEO pages: "Escrow agreement for machinery purchase India") generated from the anonymised clause library.
