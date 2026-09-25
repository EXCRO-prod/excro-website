# Excro Conditional Release — rules for Claude Code

Read `specs/00-index.md` first. These rules override convenience.

## Non-negotiables (money safety)
1. Excro never holds funds. Every rupee/dirham sits in a bank escrow account; Excro sends signed instructions.
2. Only a **signed Release Schedule** (both parties e-signed via Protean, hash-anchored) can cause a payout. Flow A (uploaded agreement): it is signed as the Escrow Release Addendum. Flow B (drafted on Excro): it is signed as an annex to the agreement. See specs/12-agreement-flows.md. Excro never performs legal review of agreements. Never add a code path that pays out from anything else.
3. No LLM output reaches the payout path. LLMs produce *proposals* stored as drafts. The condition engine and release orchestrator are deterministic code with 100% branch test coverage.
4. Money is integer minor units (paise / fils) with ISO currency. Never floats. Rounding rule: banker's rounding at the final payout line only, remainder to the party named in `rounding_beneficiary`.
5. Every payout instruction carries an idempotency key = `sha256(deal_id|outcome_id|payee_id|schedule_version)`. Replays must be no-ops.
6. Any manual override needs maker–checker (two distinct staff identities, both MFA, reason code). No exceptions for admins.
7. Every state change appends to the audit hash chain in the same DB transaction.
8. No party can sign, and no escrow account opens, unless every participant has an Excro account and Excro-verified KYC (spec 13). Never store a full Aadhaar number.
   Excro's commission leaves escrow only as a line in the signed schedule's commission plan (spec 14). Default commission is zero.
9. Data never leaves its jurisdiction cell (India → Central India/South India; UAE → UAE North/Central) except redacted text sent to the LLM gateway.

## Stack (Azure-first)
TypeScript (Node 22) services on Azure Container Apps · Next.js web on Azure Static Web Apps/Container Apps · PostgreSQL Flexible Server · Blob Storage (immutable) · Service Bus · Durable Functions (timers) · Azure AI Document Intelligence · Foundry models via APIM AI gateway · Key Vault Managed HSM · Entra External ID · Azure Communication Services. IaC: Bicep. CI: GitHub Actions with OIDC to Azure.

## Working rules
- Build in the order of `specs/10-roadmap.md`. Do not start a later phase's module early.
- Mock every external (bank, courier, e-sign, KYC) behind the adapter interfaces in `specs/05-evidence-and-integrations.md` so the whole flow runs locally.
- Visual mockup first for any new screen; get approval before backend work.
- When a spec is ambiguous, stop and ask; do not invent legal or financial behaviour.
