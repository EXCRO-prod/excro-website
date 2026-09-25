"use client";

import Link from "next/link";
// One deal: status, the next action for the viewer, the readiness panel (mockup screen "Who is in
// this escrow?"), choosing which of your parties fills your role, starting Flow A/B, and the audit trail.
// Other parties only ever see KYC status and masked identifiers, never documents (spec 13).
import { useState } from "react";
import { api, type AuditRow, type Deal, type EntitySummary, type KycView, type Participant, type Readiness } from "../api";
import { ErrorNote, KycPill, Pill, ROLE_LABEL, STATUS_LABEL, inr, pct, useAction, useIdentity, useLoad, when, useGo, appHref } from "../ui";

const FLOW_A = ["draft", "uploaded", "integrity_checked", "extracted", "gaps_open", "gaps_resolved", "addendum_ready", "signing", "signed"];
const FLOW_B = ["draft", "intake", "drafting", "in_review", "final_accepted", "stamping", "signing", "signed"];
const AFTER = ["account_open", "funded", "in_performance", "release_pending", "settled", "closed"];

export function DealPage({ id }: { id: string }) {
  const who = useIdentity();
  const deal = useLoad(() => api<Deal>(`/v1/deals/${id}`), [id]);
  const ready = useLoad(() => api<Readiness>(`/v1/deals/${id}/readiness`), [id]);
  const audit = useLoad(() => api<AuditRow[]>(`/v1/deals/${id}/audit`), [id]);
  const reload = () => { deal.reload(); ready.reload(); audit.reload(); };

  if (deal.error) return <><ErrorNote error={deal.error} /><Link href={appHref("/deals")}>← Deals</Link></>;
  const d = deal.data;
  if (!d) return <p className="muted">Loading…</p>;
  const me = d.participants.find((p) => p.isMe);
  const iAmInitiator = !!me?.isInitiator;
  const path = [...(d.flow === "B" ? FLOW_B : FLOW_A), ...AFTER];
  const at = Math.max(0, path.indexOf(d.status));

  return (
    <>
      <div className="pagehead">
        <div>
          <Link href={appHref(who?.kind === "staff" ? "/ops" : "/deals")} className="back">← {who?.kind === "staff" ? "Ops" : "Deals"}</Link>
          <div className="eyebrow">Deal {d.id}{d.flow && ` · Flow ${d.flow === "A" ? "A, uploaded agreement" : "B, drafted on Excro"}`}</div>
          <h1>{me ? `You are ${me.label}` : "Deal overview"}</h1>
        </div>
        <Pill tone={d.status === "draft" ? "warn" : "acc"}>{STATUS_LABEL[d.status] ?? d.status}</Pill>
      </div>
      <div className="progress-wrap">
        <div className="progress-label"><span className="muted">Deal progress · {STATUS_LABEL[d.status] ?? d.status}</span><b>Step {at + 1} of {path.length}</b></div>
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={path.length} aria-valuenow={at + 1}><i style={{ width: `${((at + 1) / path.length) * 100}%` }} /></div>
      </div>
      <div className="stats">
        <div className="stat blue"><div className="k">Parties joined</div><div className="v">{d.participants.filter((p) => p.joined).length} / {d.participants.length}</div></div>
        <div className="stat"><div className="k">Parties ready (KYC + bank)</div><div className="v">{ready.data ? `${ready.data.participants.filter((p) => p.ready).length} / ${ready.data.participants.length}` : "—"}</div></div>
        <div className="stat"><div className="k">Signing</div><div className="v" style={{ fontSize: 16, paddingTop: 5 }}>{ready.data?.allReady ? <Pill tone="ok">Unlocked</Pill> : <Pill tone="warn">Locked</Pill>}</div></div>
        <div className="stat"><div className="k">Created</div><div className="v" style={{ fontSize: 15, paddingTop: 4 }}>{when(d.createdAt)}</div></div>
      </div>

      <NextAction deal={d} readiness={ready.data} iAmInitiator={iAmInitiator} onChange={reload} />
      {ready.data && <ReadinessPanel deal={d} readiness={ready.data} />}
      {me && <MyParty dealId={d.id} me={me} onChange={reload} />}
      <CommissionSummary deal={d} />

      <div className="card">
        <h2>Audit trail</h2>
        <p className="small muted">Every state change is appended to a hash chain in the same transaction.</p>
        <ErrorNote error={audit.error} />
        <ul className="timeline">
          {(audit.data ?? []).slice().reverse().map((r) => (
            <li key={r.seq}>
              <span className="muted mono small">{when(r.at)}</span>
              <span><b>{r.action}</b> <span className="muted">by {r.actor}</span><br /><span className="mono muted" style={{ fontSize: 11 }}>#{r.seq} · {r.eventHash.slice(0, 16)}…</span></span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function NextAction({ deal, readiness, iAmInitiator, onChange }: { deal: Deal; readiness?: Readiness; iAmInitiator: boolean; onChange: () => void }) {
  const a = useAction();
  const unjoined = deal.participants.filter((p) => !p.joined);
  const notReady = readiness?.participants.filter((p) => !p.ready) ?? [];
  const start = (flow: "A" | "B") => a.run(async () => { await api(`/v1/deals/${deal.id}/start`, { body: { flow } }); onChange(); });
  const restart = () => a.run(async () => { await api(`/v1/deals/${deal.id}/restart`, { method: "POST" }); onChange(); });

  if (deal.status === "draft") {
    return (
      <div className="card">
        <h2>Next: {unjoined.length > 0 ? "every party joins" : iAmInitiator ? "choose how this deal starts" : "waiting for the initiator"}</h2>
        {unjoined.length > 0 && <p className="small">Waiting for {unjoined.map((p) => p.label).join(", ")} to join with their invite code. Invites went out by SMS and email.</p>}
        {deal.kycGate === "before_drafting" && notReady.length > 0 && <div className="note warn">This deal’s KYC gate is <b>before drafting</b>: every party must be verified before upload or drafting starts.</div>}
        {iAmInitiator && (
          <div className="cols" style={{ marginTop: 10 }}>
            <div className="panel">
              <h4>A · We already have a signed agreement</h4>
              <p className="small">Upload it. Excro won’t review it legally. We check it’s signed and identical for everyone, read the conditions, and flag gaps that would block a clean release. Fixes become an Escrow Release Addendum you all e-sign.</p>
              <button className="btn" disabled={a.busy || unjoined.length > 0} onClick={() => void start("A")}>Start with upload</button>
            </div>
            <div className="panel">
              <h4>B · We need a new agreement</h4>
              <p className="small">Answer a few questions. Excro drafts from lawyer-approved clauses with the failure rules built in. You all accept the same version, then e-stamp and e-sign via Protean.</p>
              <button className="btn" disabled={a.busy || unjoined.length > 0} onClick={() => void start("B")}>Draft on Excro</button>
            </div>
          </div>
        )}
        <ErrorNote error={a.error} />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Next: {deal.flow === "A" ? "upload the signed agreement" : "fill in the deal intake"}</h2>
      <div className="note">
        The {deal.flow === "A" ? "upload, integrity check, extraction and gap screens" : "intake, drafting and round-trip check screens"} arrive with the milestone 4 API. Party setup is now locked; restarting returns the deal to party setup.
      </div>
      {!readiness?.allReady && <div className="check"><span className="dot d-warn" /><div><b>Signing locked</b>: {notReady.length} of {readiness?.participants.length ?? "?"} parties not yet ready</div><Pill tone="warn">Waiting</Pill></div>}
      {iAmInitiator && <div className="row" style={{ marginTop: 10 }}><button className="btn ghost sm" disabled={a.busy} onClick={() => void restart()}>Restart from party setup</button></div>}
      <ErrorNote error={a.error} />
    </div>
  );
}

const MISSING_LABEL = { account: "Excro account", kyc: "KYC", bank_account: "verified bank account" } as const;

function money(p: Participant): string {
  if (p.role === "payer" || p.role === "payer_payee") return `${pct(p.depositShareBps)} of deposit`;
  if (p.role === "payee") return "Receives release";
  if (p.role === "fee_payee") return p.feeRule.bps ? `${pct(p.feeRule.bps)} of seller release` : p.feeRule.fixedMinor !== "0" ? `${inr(p.feeRule.fixedMinor)} from seller release` : "Fee not set";
  return "—";
}

function ReadinessPanel({ deal, readiness }: { deal: Deal; readiness: Readiness }) {
  const byId = new Map(readiness.participants.map((r) => [r.participantId, r]));
  const notReady = readiness.participants.filter((r) => !r.ready).length;
  return (
    <div className="card">
      <h2>Who is in this escrow?</h2>
      <p className="small muted">{deal.participants.length} parties. Everyone needs an Excro account and Excro-verified KYC. No one can sign and no escrow account opens until all are ready.</p>
      <div className="tbl">
        <table>
          <thead><tr><th>Party</th><th>Role</th><th className="num">Money</th><th>Excro account</th><th>KYC</th><th>Signs</th></tr></thead>
          <tbody>
            {deal.participants.map((p) => {
              const r = byId.get(p.id);
              return (
                <tr key={p.id}>
                  <td><b>{p.label}</b>{p.isMe && <> <Pill tone="acc">you</Pill></>}<br /><span className="muted small mono">{p.mobileMasked} · {p.emailMasked}</span></td>
                  <td>{ROLE_LABEL[p.role]}{p.isInitiator && <><br /><span className="muted small">initiator</span></>}</td>
                  <td className="num">{money(p)}</td>
                  <td>{p.joined ? <Pill tone="ok">Joined</Pill> : <Pill tone="warn">Invited</Pill>}</td>
                  <td>
                    {r ? <KycPill status={r.kycStatus} /> : "—"}
                    {r && (r.panMasked || r.aadhaarMasked) && <><br /><span className="muted small mono">{[r.panMasked && `PAN ${r.panMasked}`, r.aadhaarMasked && `Aadhaar ${r.aadhaarMasked}`].filter(Boolean).join(" · ")}</span></>}
                    {r && r.missing.length > 0 && <><br /><span className="muted small">needs {r.missing.map((m) => MISSING_LABEL[m]).join(", ")}</span></>}
                  </td>
                  <td>{p.signs ? `#${p.signOrder}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {readiness.allReady
        ? <div className="check"><span className="dot d-ok" /><div><b>Every party is ready</b>: signing can proceed once the schedule is agreed</div><Pill tone="ok">Ready</Pill></div>
        : <div className="check"><span className="dot d-warn" /><div><b>Signing locked</b>: {notReady} of {readiness.participants.length} parties not ready</div><Pill tone="warn">Waiting</Pill></div>}
    </div>
  );
}

/** Pick which of your Excro parties fills your role: yourself, or an entity you sign for. */
function MyParty({ dealId, me, onChange }: { dealId: string; me: Participant; onChange: () => void }) {
  const go = useGo();
  const mine = useLoad(() => api<KycView | { status: "not_started" }>("/v1/kyc/me"), []);
  const ents = useLoad(() => api<EntitySummary[]>("/v1/kyc/entities"), []);
  const [partyId, setPartyId] = useState("");
  const a = useAction();
  const own = mine.data && "partyId" in mine.data ? mine.data : null;
  const options = [...(own ? [{ id: own.partyId, label: `${own.legalName} (individual)`, status: own.status }] : []), ...(ents.data ?? []).map((e) => ({ id: e.partyId, label: `${e.legalName} (${e.type})`, status: e.status }))];

  return (
    <div className="card">
      <h2>Your role: {me.label}</h2>
      <p className="small muted">Fill this role as yourself, or as a business you’re the signatory for. Its KYC is what the other parties see as ready.</p>
      {options.length === 0 ? (
        <div className="row"><span className="small">You haven’t started KYC yet.</span><button className="btn sm" onClick={() => go("/kyc")}>Start my KYC</button></div>
      ) : (
        <div className="row">
          <select style={{ maxWidth: 360 }} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">Choose a party…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label} · {o.status.replace("_", " ")}</option>)}
          </select>
          <button className="btn sm" disabled={!partyId || a.busy} onClick={() => void a.run(async () => { await api(`/v1/deals/${dealId}/participants/${me.id}/party`, { body: { partyId } }); onChange(); })}>Use for this deal</button>
          <button className="btn ghost sm" onClick={() => go("/kyc")}>Manage KYC</button>
        </div>
      )}
      <ErrorNote error={a.error} />
    </div>
  );
}

function CommissionSummary({ deal }: { deal: Deal }) {
  const c = deal.commission;
  const label = new Map(deal.participants.map((p) => [p.id, p.label]));
  if (!c || c.amount.type === "none") return <div className="card"><h2>Excro commission</h2><p className="small muted" style={{ margin: 0 }}>None. No fee lines appear in the schedule.</p></div>;
  const amt = c.amount.type === "fixed" ? inr(c.amount.minor) : `${pct(c.amount.bps)} of deal value${c.amount.minMinor ? `, min ${inr(c.amount.minMinor)}` : ""}${c.amount.maxMinor ? `, max ${inr(c.amount.maxMinor)}` : ""}`;
  return (
    <div className="card">
      <h2>Excro commission</h2>
      <dl className="kv">
        <dt>Amount</dt><dd>{amt}</dd>
        <dt>GST</dt><dd>{pct(c.gst.rateBps)} {c.gst.mode}</dd>
        <dt>Paid by</dt><dd>{c.payers.map((p) => `${label.get(p.participantId) ?? p.participantId} ${pct(p.shareBps)}`).join(" · ")}</dd>
        <dt>Collected</dt><dd>{c.collect.replace(/_/g, " ")}</dd>
        <dt>If the deal fails</dt><dd>{c.onFailure.replace(/_/g, " ")}</dd>
      </dl>
    </div>
  );
}
