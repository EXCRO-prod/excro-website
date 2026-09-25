# 04 · AI pipeline & human-in-the-loop

> Which parts run depends on the agreement flow (spec 12): Flow A uses A (extraction), B (HITL) and C (gap options); Flow B uses D (drafting) with C inside the draft, then A as the round-trip check.

The AI does three jobs: **read** agreements, **suggest** failure rules, and **draft** new agreements. It never decides a payout. Accuracy comes from the design below, not from trusting one model.

## A. Reading an agreement (extraction)
```
upload → malware scan → immutable blob (WORM) → Document Intelligence (layout + OCR, in-cell)
      → PII redaction/tokenisation (Azure AI Language) → LLM gateway (APIM)
      → Extractor A (model family 1) ┐
      → Extractor B (model family 2) ┴→ reconcile → citation verifier → confidence → review UI
```
1. **Layout first.** Document Intelligence runs in the deal's cell and returns text with page + bounding boxes. Scanned documents are fine; handwriting is flagged.
2. **Redact before the LLM.** Names, IDs, account numbers, addresses are replaced with stable tokens (`[PARTY_1]`, `[ACCT_1]`) before any text goes to a model deployed outside the cell. Tokens are re-hydrated in-cell after extraction.
3. **Two independent extractions.** Two different model families (e.g. a Claude model and a GPT model via Foundry) extract into the same strict JSON schema (conditions, amounts, dates, parties, deductions, termination, dispute clause). Structured outputs only.
4. **Reconcile.** Field-by-field comparison. Agree → candidate high confidence. Disagree → field marked *contested* and shown with both readings.
5. **Citation verifier (deterministic).** Every field must cite a quote; the quote must exist verbatim (fuzzy ≥ 0.95) in the OCR text at the cited page. No quote, no field. This kills hallucinated conditions.
6. **Gap detector.** Checklist per deal type (e.g. goods sale needs: deposit, dispatch, delivery, inspection, acceptance, termination, dispute seat). Missing items become playbook prompts, not silent defaults.

### Confidence bands
| Band | Rule | UI treatment |
|---|---|---|
| Green | both extractors agree + citation verified + value passes type checks | pre-filled, still needs party tick |
| Amber | one extractor only, or low OCR quality on cited region | highlighted, must open source snippet before ticking |
| Red | extractors disagree, or citation fails, or amount/date conflict across clauses | blocks signing until a human resolves |

## B. Human-in-the-loop (HITL)
Three layers. None can be skipped by configuration.
1. **Both parties confirm every condition individually.** Each condition card shows the extracted value next to the highlighted source text. There is no "accept all" button. Edits are recorded with who/when; editing a value re-runs the money map.
2. **Cross-confirmation.** A party's edit re-opens that condition for the other party. Signing is only enabled when both have ticked the same version (compared by hash).
3. **Excro reviewer queue** (internal), required when any of: deal value ≥ threshold (tenant-configurable, default ₹25 lakh / AED 100k); any Red field resolved by a party edit; any custom clause wording; first deal for a new tenant. The reviewer checks the extraction against the source, not the commercial merits. SLA: 4 business hours.

Every HITL decision is stored as labelled data: (source span, model outputs, human final value). This is the training/eval signal and the core proprietary dataset.

## C. Scenario Playbook (suggesting failure rules)
- Input: confirmed conditions + deal type + jurisdiction.
- Engine: deterministic checklist of failure modes per deal type (see Spec v0.1 playbook tables) → for each gap, retrieve candidate clauses from the **approved clause library** (Azure AI Search, hybrid vector + keyword, filtered by jurisdiction and deal type) → LLM ranks candidates and proposes parameter defaults with a one-line rationale.
- Parties can change parameters within library bounds (e.g. cancellation fee 0–5%). Changing wording = custom clause → legal review.
- Output feeds the money-map validator; nothing is proposed that makes the map unbalanced.

## D. Generating new agreements from the repository
**Data rights first.** Client agreements are confidential. Rules:
- Each tenant has a **private library** built from its own agreements. Only that tenant's users can draft from it.
- The **shared library** contains only (a) Excro's lawyer-drafted clauses and (b) clauses from tenants who opted in by contract, after anonymisation (parties, amounts, places removed) and legal approval. Never raw documents.
- Retrieval is always tenant-scoped by security filter in the search index (not by prompt instruction).

**Generation flow.**
1. Guided intake (deal type, parties, goods/services, amounts, dates, jurisdiction) — form + chat.
2. Retrieve: best template for deal type + top-k clause variants per section (from private + shared libraries), ranked by fit and by **outcome score** (how often deals with that clause ended in disputes).
3. Draft: LLM assembles the template, fills deal facts, adapts wording within the clause's allowed variations. Every clause in the output keeps its library ID.
4. Check: consistency checker (dates, amounts, party names agree across clauses); the resulting agreement is re-run through Extraction (section A) and must round-trip to the same Release Schedule. Non-round-trip = draft rejected.
5. Review: parties edit in a redline editor; changes to library clauses are flagged; "Draft generated with AI assistance — review with your lawyer" is shown on every generated agreement. Excro's legal partner offers optional paid review.

**Why round-trip matters:** the agreement and the schedule can never disagree, which is the biggest single source of escrow disputes.

## E. Guardrails
- Model deployments are called only through the APIM AI gateway: auth, per-tenant quotas, prompt/response logging (redacted), content safety with prompt-injection shields on document content.
- Uploaded documents are untrusted input. The model has no tools, no network, no write access. Instructions inside documents are ignored by design because nothing the model says can act.
- Model/version pinning per environment; any model change must pass the eval gate.

## F. Evaluation (accuracy you can prove)
- **Golden set:** 300 annotated agreements (India goods, services, JV; later UAE trade and real estate), double-annotated by two paralegals, disagreements adjudicated.
- **Metrics:** condition recall, field-level precision per type (amount, date, party, deadline, deduction formula), citation validity rate, % Red fields, HITL edit rate in production.
- **Gates:** CI blocks a prompt/model change if condition recall < 95% or amount/date precision < 99% on the golden set.
- **Production monitoring:** weekly sample of 5% confirmed deals re-audited by ops; edit-rate drift alerts.
