# 05 · Evidence & integrations

Every integration sits behind an adapter interface with a mock implementation. Adapters return **evidence records** (raw payload stored immutably + normalised fields + checks) — never booleans alone.

```ts
interface EvidenceAdapter<TReq, TNorm> {
  kind: string;                      // "courier", "bank", "gst", ...
  verify(req: TReq, ctx: DealContext): Promise<EvidenceRecord<TNorm>>;
  subscribe?(ref: string, ctx: DealContext): Promise<void>;   // webhooks
}
type EvidenceRecord<T> = { raw_uri: string; normalized: T; checks: Check[]; result: "pass"|"fail"|"review"; fetched_at: string };
```

## Banking (reuse Excro's existing bank connectors)
| Capability | Needed from bank | Notes |
|---|---|---|
| Escrow master account + virtual account per deal | VA creation API or pre-allotted VA pool | Pool approach works with banks lacking create-API |
| Credit notification | Webhook/ECollect callback with remitter name, account, IFSC, UTR | Remitter match against verified payer |
| Payout on instruction | API payout (NEFT/RTGS/IMPS) from escrow account, with maker–checker at bank or pre-agreed STP mandate | Signed instruction; bank verifies signature |
| Statement | Intraday + EOD statement API | Daily reconciliation |
| Refund to source | Payout to the remitting account | For wrong-remitter and overpayment |
Phase 1: one bank from Excro's existing four (YES, Axis, IDFC FIRST, ICICI) — the first to sign the three-way escrow template and STP payout mandate.

## India evidence sources
| Evidence | Source | Checks |
|---|---|---|
| Identity & business | Mobile/email OTP; PAN and Aadhaar via **Protean or another authorised KYC provider** (full Aadhaar never stored); GSTIN; MCA CIN/LLPIN master data; sanctions/PEP screening. Full rules in spec 13 | name match across sources; GSTIN active; signatory authority; UBO ≥ 10% |
| Bank account ownership | Penny-drop via bank | account holder name ≈ party name |
| Dispatch / delivery | Courier aggregator API (e.g. Shiprocket) + direct Delhivery/Blue Dart later | see slip checks in Spec v0.1 |
| Tax invoice | E-invoice IRN + signed QR verification | IRN valid, GSTINs match parties, value matches |
| E-way bill | E-way bill verification | vehicle/transport ID, value, from/to |
| E-sign & e-stamp | **Protean eSignPro** (Aadhaar OTP/biometric eSign, DSC, multi-signer; PAN-India e-stamping). See spec 12 | signer name ≈ KYC name; signatures re-validated by Excro |
| Notifications | Azure Communication Services (email, SMS, WhatsApp) | delivery receipts stored |

## Trade (India ↔ UAE, Phase 3)
| Evidence | Source | Checks |
|---|---|---|
| Shipment booked/loaded | Carrier track-and-trace (DCSA-standard APIs where available), container number | container & B/L number exist; port of loading |
| Bill of lading | eBL platform (e.g. DCSA-interoperable providers) or scanned B/L + carrier confirmation | shipper/consignee/notify party match; goods description |
| Export declaration | Shipping bill (ICEGATE) — uploaded + verified via AD bank / EDPMS reference | value & HS code consistent |
| Import clearance | Dubai Customs / Dubai Trade declaration reference (uploaded; API access to confirm) | declaration no. valid |
| Certificate of origin | DGFT e-CoO (India) | CEPA preferential origin |
| Quality/quantity | Third-party inspection report (SGS, Bureau Veritas, Intertek) via sign-off link | inspector identity verified |
Trade conditions use Incoterms 2020 terms to set when risk passes (FOB vs CIF changes who bears transit loss in the playbook).

## Real estate (UAE, Phase 3)
| Evidence | Source | Checks |
|---|---|---|
| Title / ownership | DLD title deed verification (DLD e-services / Dubai REST) | seller = registered owner; no mortgage block or with bank NOC |
| MOU (Form F) | Uploaded + extraction | price, deposit, transfer date |
| Mortgage NOC / liability letter | Bank letter + sign-off | amount to settle to bank first |
| Transfer completion | Trustee office transfer confirmation / new title deed | buyer on title → release |

## UAE identity & signing
UAE Pass for individuals (identity + digital signature); trade licence verification for companies; AML/sanctions screening via vendor for both cells.

## Integration priority (Phase 1 → 3)
1. Bank (one), penny-drop, PAN/GSTIN, Aadhaar eSign, courier aggregator, e-invoice IRN, ACS notifications.
2. Second bank, direct couriers, ODR partner, CKYC.
3. UAE bank/licensed partner, UAE Pass, DLD verification, carrier/eBL, inspection sign-offs.
