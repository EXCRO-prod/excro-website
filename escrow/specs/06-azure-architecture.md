# 06 · Azure architecture

## Shape: jurisdiction cells + thin global control plane
- **Cell IN** — primary *Central India*, DR *South India*. All Indian deal data, documents, ledger, payment data (RBI storage of payment system data in India).
- **Cell AE** — primary *UAE North*, DR *UAE Central*. Phase 3.
- **Cell SA** — *Saudi Arabia East* (Microsoft announced availability for November 2026). Phase 4, only after a KSA partner/licence.
- **Global control plane** (Central India): tenant directory (no PII beyond admin emails), clause library (anonymised), templates, feature flags, model gateway config.
A deal is pinned to one cell at creation and never moves. Cross-cell calls are forbidden except control-plane reads.

## Service map (per cell)
| Layer | Azure service | Why |
|---|---|---|
| Edge | Azure Front Door Premium + WAF, Private Link to origins | TLS, bot/OWASP rules, custom tenant domains |
| Web | Next.js on Azure Container Apps (or Static Web Apps for marketing) | SSR, white-label theming |
| Identity | Microsoft Entra External ID (customers), Entra ID + PIM + phishing-resistant MFA (staff) | B2B/B2C sign-in, conditional access |
| APIs | Azure API Management (public API + **AI gateway** for model calls) | keys, quotas, per-tenant rate limits, token metering |
| Services | Azure Container Apps (deal, schedule, evidence, engine, orchestrator, notification) | scale-to-zero, cheap for a small team |
| Timers / sagas | Azure Durable Functions (one orchestration per deal) | deadlines, reminders, objection windows |
| Messaging | Azure Service Bus Premium (sessions per deal, duplicate detection) + Event Grid (inbound webhooks) | ordered, exactly-once-ish processing |
| System of record | Azure Database for PostgreSQL Flexible Server, zone-redundant HA, PITR 35 days | ledger, deals, schedules, audit chain |
| Documents & evidence | Blob Storage with immutability (WORM) policies, versioning, customer-managed keys | tamper-proof evidence |
| Search | Azure AI Search (hybrid vector) with security-trimmed filters | clause library, tenant-private retrieval |
| Document AI | Azure AI Document Intelligence (layout, prebuilt invoice, custom models for courier slips/B/L) | in-cell OCR |
| PII | Azure AI Language PII detection | redact before LLM |
| LLMs | Microsoft Foundry models through APIM gateway | see residency note |
| Safety | Azure AI Content Safety (prompt shields) | injection defence on document text |
| Keys | Key Vault Managed HSM (or Key Vault Premium HSM-backed where Managed HSM isn't in region) | payout signing keys, CMK |
| Audit anchoring | Hash chain in Postgres; daily root anchored to Azure Confidential Ledger (confirm region) or immutable blob | independent tamper evidence |
| Notifications | Azure Communication Services (email, SMS, WhatsApp) | one vendor, delivery receipts |
| Observability | Application Insights, Log Analytics, Azure Monitor alerts | SLOs, payout anomaly alerts |
| Security ops | Defender for Cloud, Microsoft Sentinel, Azure Policy, Private Endpoints everywhere | posture + SIEM |
| Delivery | GitHub Actions (OIDC), Bicep, Azure Container Registry, environments dev/stage/prod in separate subscriptions | repeatable, auditable |

## LLM residency — decide consciously
Research (Sep 2026):
- Claude models on Foundry are offered as **Global Standard** (inference may run in any region) and **Data Zone US** for some versions; no India or UAE data zone.
- For GPT-4o/4.1 in UAE North, Microsoft states regional (in-UAE) processing requires **Provisioned** deployments; Global deployments can process anywhere.
- Check current Central India model availability in the Foundry portal for your subscription before committing.

**Design decision:** documents are OCR'd and **redacted in-cell**; only tokenised text goes to Global deployments. Payment/ledger data never goes to any model. Offer a **"strict residency"** tenant option later that routes to an in-region Provisioned deployment (cost passed to the tenant — typically banks/government). Do not let Azure credits dictate the model: keep the gateway model-agnostic and choose models by eval score.

## Network
Hub-and-spoke VNet per cell; all PaaS via Private Endpoints; no public DB/storage endpoints; egress through Azure Firewall with FQDN allow-list (bank APIs, courier, KYC, Foundry). Bank connectivity via mTLS with client certs in HSM; static egress IPs for bank allow-lists.

## Resilience
- RPO ≤ 5 min, RTO ≤ 1 h for payouts path (zone-redundant DB + geo-replica to paired region).
- Payout orchestrator is single-writer per bank (leader lock) to avoid double instructions during failover.
- Chaos drills quarterly: bank API down, courier webhook storm, region failover.

## Cost levers (credits-aware)
- Container Apps consumption + scale-to-zero in dev/stage; Postgres Burstable in dev.
- Document Intelligence and LLM calls metered per tenant via APIM → pass-through pricing on heavy users.
- Avoid Provisioned model throughput until a tenant pays for strict residency.
- Budgets + alerts per subscription; tag every resource with `cell`, `env`, `service`.
