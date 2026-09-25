# Excro Conditional Release — Build Specs v1.0 (21 Sep 2026)

Prepared by Speedstar AI Labs for Excro (ESAAS Technologies Pvt Ltd). Companion to the published Master Plan.

| # | Spec | What it settles |
|---|------|-----------------|
| 01 | [Product requirements](01-product-requirements.md) | Personas, journeys, feature list, NFRs, success metrics |
| 02 | [Domain model & state machine](02-domain-model.md) | Entities, Release Schedule schema, deal/condition states, money-map validator |
| 03 | [Condition & release engine](03-condition-release-engine.md) | Evaluation rules, timers, waterfall, payout orchestration |
| 04 | [AI pipeline & human-in-the-loop](04-ai-pipeline-hitl.md) | Extraction, citations, confidence, review queues, playbook, agreement generation, evals |
| 05 | [Evidence & integrations](05-evidence-and-integrations.md) | Bank, courier, GST, trade documents, e-sign, KYC adapters (India + UAE) |
| 06 | [Azure architecture](06-azure-architecture.md) | Services, jurisdiction cells, residency, network, DR, cost levers |
| 07 | [Security & compliance](07-security-compliance.md) | Threat model, controls, RBI / DPDP / CBUAE / ADGM mapping |
| 08 | [API & webhooks](08-api.md) | Public API, tenant webhooks, white-label |
| 09 | [UX, onboarding & customisation](09-ux-onboarding.md) | Counterparty invite loop, KYC-light onboarding, tenant configuration |
| 10 | [Roadmap & team](10-roadmap.md) | Phases, exit criteria, what 2 people + Claude Code can ship |
| 11 | [Middle East expansion](11-middle-east.md) | UAE/KSA regulation, use cases, entry model |
| 13 | [Parties, accounts & KYC](13-parties-and-kyc.md) | 2+ parties and roles, mandatory Excro account, individual and entity KYC, KYC gate |
| 14 | [Excro commission](14-excro-commission.md) | Platform fee plan: default zero, who pays, collected at funding / at release / outside escrow, refundability |
| 12 | [Agreement flows](12-agreement-flows.md) | Uploaded signed agreement (gap flags + e-signed addendum) vs drafted on Excro (Protean e-stamp + e-sign) |

Glossary: **Release Schedule** = the signed, machine-readable set of conditions and outcomes. **Money map** = every terminal outcome with payouts summing to the deposit. **Cell** = one jurisdiction's isolated deployment.
