# 08 · API & webhooks

REST + JSON, versioned `/v1`, OAuth2 client credentials (tenants) via APIM. All money in minor units. Idempotency-Key header on every POST.

| Method | Path | Purpose |
|---|---|---|
| POST | /v1/deals | Create deal (type, parties, currency, value) |
| POST | /v1/deals/{id}/agreements | Upload agreement (multipart) → starts extraction |
| POST | /v1/deals/{id}/agreements:generate | Generate draft from template + intake |
| GET | /v1/deals/{id}/extraction | Extraction with confidence + citations |
| GET/PATCH | /v1/deals/{id}/schedule | Draft Release Schedule; PATCH parameters only |
| POST | /v1/deals/{id}/schedule:confirm | Party confirms condition(s) (user token, not tenant token) |
| POST | /v1/deals/{id}/schedule:sign | Starts e-sign for a party |
| GET | /v1/deals/{id}/escrow-account | Virtual account details |
| POST | /v1/deals/{id}/evidence | Submit evidence (file or reference, e.g. tracking no.) |
| POST | /v1/deals/{id}/actions | accept_all / accept_units / reject / cancel / extend |
| POST | /v1/deals/{id}/disputes | Raise dispute with amount + reason + evidence |
| GET | /v1/deals/{id}/ledger | Sub-ledger and payouts |
| GET | /v1/deals/{id}/audit | Audit events + hash-chain proof |

Party-consent actions (confirm, sign, accept, dispute) always require the party's own authenticated session. A tenant API key can never confirm or sign on a party's behalf.

## Webhooks (to tenants)
`deal.extracted`, `schedule.proposed`, `schedule.signed`, `escrow.funded`, `condition.satisfied`, `condition.overdue`, `outcome.triggered`, `payout.sent`, `payout.settled`, `dispute.opened`, `dispute.resolved`, `deal.closed`.
Signed with HMAC-SHA256 (`Excro-Signature`), retried with backoff for 24h, replay-protected by timestamp.

## Embeds (white-label)
- Hosted flows at `escrow.<tenant-domain>` (CNAME via Front Door) with tenant theme.
- Drop-in web component `<excro-deal deal-id="...">` for marketplaces and brokers.
