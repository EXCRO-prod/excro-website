# 07 · Security & compliance

## Threat model (top risks → controls)
| Threat | Control |
|---|---|
| Fake evidence (forged slip, reused tracking no.) | API confirmation, cross-deal uniqueness, weight/pincode checks, OTP fallback |
| Account takeover of a party | Entra External ID + OTP/passkeys, step-up MFA for sign/confirm/dispute, device binding, new-device cool-off before payee changes |
| Payee account swap | Payee accounts locked at signing; change = re-sign by both + 48h hold + penny-drop |
| Insider releasing funds | No single-person payout path; maker–checker; PIM just-in-time admin; HSM-held signing key; bank verifies signature |
| Prompt injection via uploaded document | LLM has no tools/actions; content safety shields; outputs are drafts |
| Duplicate / replayed payout | Idempotency keys; bank-side dedupe; outbox pattern |
| Ledger tampering | Append-only hash chain; daily external anchor; DB audit logging |
| Money laundering (third-party funding, round-tripping) | Remitter match; return-to-source; AML screening; velocity rules; STR workflow via bank |
| Data breach | Private endpoints, CMK encryption, field-level encryption for IDs, least privilege, Sentinel detections |
| Cross-tenant data leak in AI retrieval | Security filters in AI Search per tenant; tests that assert zero cross-tenant hits |

## Regulatory mapping (validate with counsel)
| Jurisdiction | Requirement | Design response |
|---|---|---|
| India — RBI PA Directions (15 Sep 2025) | Aggregating funds for merchants is a licensed PA activity (₹15 cr net worth at application, ₹25 cr by year 3); PAs can't run marketplaces | Excro stays a technology provider: bank is escrow agent, funds in bank escrow, bank executes instructions under three-way agreement. Legal opinion before launch. |
| India — payment data storage | Payment system data stored only in India | Cell IN; no payment data to LLMs |
| India — Aadhaar | Online authentication by private entities needs approval (2025 amendment process) | Offline verification via vendor; never store full Aadhaar number (spec 13) |
| India — PMLA KYC | Beneficial owners at 10% for companies (2023 amendment); record-keeping | Entity KYC captures UBOs; retention per counsel |
| India — DPDP Act 2023 & Rules | Consent, purpose limitation, breach notice, data principal rights | Consent ledger, retention schedules, DSR workflow |
| India — FEMA / cross-border | Cross-border flows via AD banks; PA-CB caps | Phase 3 trade escrow only via AD bank / licensed partner |
| UAE — escrow agents | Must be regulated (CBUAE-licensed bank, or DFSA/FSRA-regulated; e.g. TrustIn under ADGM FSRA Cat 3C with Emirates NBD holding funds) | Partner with a licensed agent/bank first; own ADGM licence later |
| UAE — Dubai off-plan real estate | Law No. 8 of 2007: developer project escrow with approved banks | Not our segment; target resale deposits & cross-border buyers |
| KSA — off-plan (Wafi/REGA) | Developer escrow with banks under SAMA/REGA rules | Not our segment; revisit B2B trade later |

## Assurance plan
Before first live payment: external pen-test, secure code review of engine/orchestrator, bank's security questionnaire, DR drill. Within 12 months: ISO 27001 certification (usually requested by banks), SOC 2 Type I if selling to global tenants.
