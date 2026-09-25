"use client";

// Excro Ops console: KYC review queue and maker–checker (CLAUDE.md #6). High-risk cases need two
// distinct staff identities, both entering MFA, with a reason code; the server refuses self-approval,
// admins included. Reviewers see status and masked identifiers only.
import { useState, type FormEvent } from "react";
import { api, REASON_CODES, type MakerCheckerRequest, type QueueItem } from "../api";
import { ErrorNote, Field, Pill, useAction, useIdentity, useLoad, when, useGo } from "../ui";

export function OpsPage() {
  const go = useGo();
  const who = useIdentity();
  const queue = useLoad(() => api<QueueItem[]>("/v1/ops/kyc-queue"), []);
  const pending = useLoad(() => api<MakerCheckerRequest[]>("/v1/ops/maker-checker"), []);
  const reload = () => { queue.reload(); pending.reload(); };
  const [dealId, setDealId] = useState("");

  if (who?.kind !== "staff") return <div className="card empty"><p>The Ops console needs an Excro staff session.</p><button className="btn" onClick={() => go("/signin")}>Staff sign-in</button></div>;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Excro Ops console · {who.label.replace(/^Ops · /, "")}</div>
          <h1>KYC review queue</h1>
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (dealId.trim()) go(`/deals/${dealId.trim()}`); }}>
          <input className="mono" style={{ width: 170 }} placeholder="EX-2609-0001" value={dealId} onChange={(e) => setDealId(e.target.value)} aria-label="Deal ID" />
          <button className="btn ghost sm">Open deal</button>
        </form>
      </div>
      <ErrorNote error={queue.error} />
      {queue.data?.length === 0 && <div className="card empty">Nothing waiting for review.</div>}
      {queue.data?.map((item) => <ReviewCard key={item.reviewId} item={item} onChange={reload} />)}

      <div className="card">
        <h2>Maker–checker requests</h2>
        {pending.data?.length === 0 && <p className="small muted" style={{ margin: 0 }}>No pending requests.</p>}
        {pending.data?.map((r) => (
          <div key={r.id} className="check">
            <span className="dot d-warn" />
            <div><b>{r.kind}</b> on <span className="mono">{r.subjectRef}</span> · proposes <b>{String(r.payload.decision ?? "")}</b><br /><span className="muted small">by {r.makerId} · {r.reasonCode}{r.note && ` · “${r.note}”`}</span></div>
            <Pill tone="hold">Needs checker</Pill>
          </div>
        ))}
      </div>
      <ChainCheck />
    </>
  );
}

const REASON_TEXT: Record<string, string> = {
  name_mismatch_pan_aadhaar: "Name on Aadhaar differs from PAN",
  screening_hit: "Sanctions / watchlist screening hit",
  documents_pending_review: "Entity documents need review",
  non_gst_entity: "Not GST-registered (Udyam / shop certificate)",
  gstin_name_mismatch: "GSTIN legal name differs",
  pan_name_mismatch: "PAN name differs",
};

function ReviewCard({ item, onChange }: { item: QueueItem; onChange: () => void }) {
  const who = useIdentity();
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reasonCode, setReasonCode] = useState<string>(REASON_CODES[0]);
  const [note, setNote] = useState("");
  const [mfa, setMfa] = useState("");
  const a = useAction();
  const p = item.proposal;
  const myOwnProposal = p && who?.key === `staff:${p.makerId}`;

  const propose = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      await api(`/v1/ops/kyc/${item.reviewId}/decide`, { body: { decision, reasonCode, note: note || undefined, mfaCode: mfa } });
      setMfa("");
      onChange();
    });
  };
  const check = (approve: boolean) =>
    a.run(async () => {
      await api(`/v1/ops/maker-checker/${p!.requestId}/${approve ? "approve" : "reject"}`, { body: { mfaCode: mfa } });
      setMfa("");
      onChange();
    });

  return (
    <div className="card">
      <div className="pagehead" style={{ marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0 }}>{item.legalName}</h2>
          <span className="small muted mono">{item.partyId} · PAN {item.panMasked ?? "—"} · Aadhaar {item.aadhaarMasked ?? "—"} · {when(item.createdAt)}</span>
        </div>
        <Pill tone={item.risk === "high" ? "bad" : "hold"}>{item.risk === "high" ? "High risk · maker–checker" : "Normal · single decision"}</Pill>
      </div>
      <ul className="tight small">{item.reasons.map((r) => <li key={r}>{REASON_TEXT[r] ?? r}</li>)}</ul>

      {p ? (
        <div>
          <div className="note">
            <b>{p.makerId}</b> proposed <b>{p.decision}</b>. A different staff member must approve or reject it.
          </div>
          {myOwnProposal ? (
            <p className="small muted">You made this proposal, so you can’t check it. Switch to another staff identity.</p>
          ) : (
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div style={{ width: 160 }}><Field label="Your MFA code"><input className="mono" inputMode="numeric" value={mfa} onChange={(e) => setMfa(e.target.value)} /></Field></div>
              <div className="row" style={{ marginBottom: 12 }}>
                <button className="btn" disabled={!mfa || a.busy} onClick={() => void check(true)}>Approve as checker</button>
                <button className="btn ghost" disabled={!mfa || a.busy} onClick={() => void check(false)}>Reject proposal</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={propose}>
          <div className="seg" role="group" aria-label="Decision">
            <button type="button" aria-pressed={decision === "approve"} onClick={() => setDecision("approve")}>Approve KYC</button>
            <button type="button" aria-pressed={decision === "reject"} onClick={() => setDecision("reject")}>Reject KYC</button>
          </div>
          <div className="grid-form">
            <Field label="Reason code"><select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>{REASON_CODES.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label={reasonCode === "OTHER_WITH_NOTE" ? "Note (required)" : "Note (optional)"}><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Field label="Your MFA code"><input className="mono" inputMode="numeric" value={mfa} onChange={(e) => setMfa(e.target.value)} required /></Field>
          </div>
          <button className="btn" disabled={a.busy}>{item.risk === "high" ? "Propose decision (maker)" : "Record decision"}</button>
        </form>
      )}
      <ErrorNote error={a.error} />
    </div>
  );
}

function ChainCheck() {
  const a = useAction();
  const [res, setRes] = useState<unknown>(null);
  return (
    <div className="card">
      <h2>Audit hash chain</h2>
      <p className="small muted">Re-computes every event hash and link from the start of the chain.</p>
      <button className="btn ghost sm" disabled={a.busy} onClick={() => void a.run(async () => setRes(await api("/v1/audit:verify")))}>Verify chain</button>
      {res !== null && <pre className="mono small" style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{JSON.stringify(res, null, 2)}</pre>}
      <ErrorNote error={a.error} />
    </div>
  );
}
