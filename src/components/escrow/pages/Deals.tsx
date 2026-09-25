"use client";

import Link from "next/link";
// Deals list and joining a deal from an invite code.
import { useState, type FormEvent } from "react";
import { api, type DealSummary } from "../api";
import { ErrorNote, Field, Pill, STATUS_LABEL, useAction, useLoad, when, useGo, appHref } from "../ui";

export function DealsPage() {
  const go = useGo();
  const deals = useLoad(() => api<DealSummary[]>("/v1/deals"), []);
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Your escrow deals</div>
          <h1>Deals</h1>
        </div>
        <button className="btn" onClick={() => go("/deals/new")}>New deal</button>
      </div>
      <ErrorNote error={deals.error} />
      {deals.data && deals.data.length === 0 && (
        <div className="card empty">
          <p><b>No deals yet.</b></p>
          <p className="small">Start one, or join with the invite code someone sent you.</p>
        </div>
      )}
      {deals.data && deals.data.length > 0 && (
        <div className="tbl">
          <table>
            <thead><tr><th>Deal</th><th>You are</th><th>Status</th><th>Flow</th><th>Created</th></tr></thead>
            <tbody>
              {deals.data.map((d) => (
                <tr key={d.id} className="link" onClick={() => go(`/deals/${d.id}`)}>
                  <td className="mono"><Link href={appHref(`/deals/${d.id}`)}>{d.id}</Link></td>
                  <td>{d.myLabel}</td>
                  <td><Pill tone={d.status === "draft" ? "warn" : "acc"}>{STATUS_LABEL[d.status] ?? d.status}</Pill></td>
                  <td>{d.flow ? (d.flow === "A" ? "A · uploaded" : "B · drafted") : "—"}</td>
                  <td className="small muted">{when(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <JoinDeal onJoined={deals.reload} />
    </>
  );
}

/** Invite messages carry the deal id and a one-time code; the code only works for the invited mobile's own account. */
function JoinDeal({ onJoined }: { onJoined: () => void }) {
  const go = useGo();
  const [dealId, setDealId] = useState("");
  const [code, setCode] = useState("");
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      await api(`/v1/deals/${dealId.trim()}/parties:join`, { body: { token: code.trim() } });
      onJoined();
      go(`/deals/${dealId.trim()}`);
    });
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>Join a deal</h2>
      <p className="small muted">Paste the deal ID and invite code from your SMS or email invitation.</p>
      <div className="grid-form">
        <Field label="Deal ID"><input className="mono" placeholder="EX-2609-0001" value={dealId} onChange={(e) => setDealId(e.target.value)} required /></Field>
        <Field label="Invite code"><input className="mono" value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
      </div>
      <ErrorNote error={a.error} />
      <button className="btn ghost" disabled={a.busy}>Join deal</button>
    </form>
  );
}
