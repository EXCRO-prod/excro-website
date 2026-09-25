"use client";

import Link from "next/link";
// Entity KYC (spec 13): company, LLP, partnership, proprietorship, trust. Document checks always
// go to an Excro reviewer, so an entity never auto-verifies. Document rules mirror server/src/kyc/entityRules.ts.
import { useState, type FormEvent } from "react";
import { api, type EntityKycView, type EntityType } from "../api";
import { CheckPill, ErrorNote, Field, KycPill, useAction, useLoad, useGo, appHref } from "../ui";

const TYPES: { v: EntityType; label: string }[] = [
  { v: "company", label: "Private / public company" },
  { v: "llp", label: "LLP" },
  { v: "partnership", label: "Partnership firm" },
  { v: "proprietorship", label: "Sole proprietorship" },
  { v: "trust", label: "Trust / society" },
];

const REQUIRED_DOCS: Record<EntityType, string[][]> = {
  company: [["incorporation_certificate"], ["moa_aoa"], ["address_proof"]],
  llp: [["llp_agreement"]],
  partnership: [["partnership_deed"]],
  trust: [["trust_deed"]],
  proprietorship: [["gstin_certificate", "udyam_certificate"], ["shop_establishment_certificate"]],
};
const NEEDS_GSTIN: EntityType[] = ["company", "llp", "partnership"];
const NEEDS_UBO: EntityType[] = ["company", "llp", "partnership"];
const AUTHORITY = ["board_resolution", "authorisation_letter"];
const docLabel = (k: string) => k.replace(/_/g, " ");

export function NewEntityForm({ onDone }: { onDone: (partyId?: string) => void }) {
  const [type, setType] = useState<EntityType>("company");
  const [f, setF] = useState({ legalName: "", pan: "", gstin: "", regNo: "", gstExempt: false });
  const a = useAction();
  // Identifiers are upper-case by definition; the registered name is kept as typed.
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : k === "legalName" ? e.target.value : e.target.value.toUpperCase() });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const body: Record<string, unknown> = { type, legalName: f.legalName };
      if (type !== "proprietorship") body.pan = f.pan.toUpperCase();
      if (NEEDS_GSTIN.includes(type)) {
        if (f.gstExempt) body.gstExempt = true;
        else body.gstin = f.gstin.toUpperCase();
      }
      if (f.regNo) body.regNo = f.regNo.toUpperCase();
      const r = await api<{ partyId: string }>("/v1/kyc/entity", { body });
      onDone(r.partyId);
    });
  };
  const regLabel = type === "company" ? "CIN" : type === "llp" ? "LLPIN" : type === "trust" ? "Registration number" : null;
  return (
    <form onSubmit={submit} className="panel" style={{ marginBottom: 14 }}>
      <h4>New entity</h4>
      <div className="seg" role="group" aria-label="Entity type">
        {TYPES.map((t) => <button type="button" key={t.v} aria-pressed={type === t.v} onClick={() => setType(t.v)}>{t.label}</button>)}
      </div>
      <div className="grid-form">
        <Field label="Registered name"><input value={f.legalName} onChange={set("legalName")} required /></Field>
        {type !== "proprietorship" && <Field label="Entity PAN"><input className="mono" value={f.pan} onChange={set("pan")} maxLength={10} required /></Field>}
        {NEEDS_GSTIN.includes(type) && !f.gstExempt && <Field label="GSTIN" hint="Must embed the entity PAN."><input className="mono" value={f.gstin} onChange={set("gstin")} maxLength={15} required /></Field>}
        {regLabel && <Field label={regLabel}><input className="mono" value={f.regNo} onChange={set("regNo")} required={type !== "trust"} /></Field>}
      </div>
      {NEEDS_GSTIN.includes(type) && (
        <label className="check-row">
          <input type="checkbox" checked={f.gstExempt} onChange={set("gstExempt")} />
          Below the GST threshold (Udyam or shop &amp; establishment certificate instead; goes to review)
        </label>
      )}
      {type === "proprietorship" && <p className="small muted">A proprietorship uses your own individual KYC plus two business proofs.</p>}
      <ErrorNote error={a.error} />
      <div className="row">
        <button className="btn" disabled={a.busy}>Verify and continue</button>
        <button type="button" className="btn ghost" onClick={() => onDone()}>Cancel</button>
      </div>
    </form>
  );
}

export function EntityKycPage({ partyId }: { partyId: string }) {
  const v = useLoad(() => api<EntityKycView>(`/v1/kyc/entity/${partyId}`), [partyId]);
  const e = v.data;
  if (v.error) return <ErrorNote error={v.error} />;
  if (!e) return <p className="muted">Loading…</p>;
  const editable = e.status === "in_progress";
  const uploaded = new Set(e.documents.map((d) => d.kind));
  const slots = [...REQUIRED_DOCS[e.type], ...(NEEDS_GSTIN.includes(e.type) && !e.gstRegistered ? [["udyam_certificate", "shop_establishment_certificate"]] : [])];
  const docsOk = slots.every((s) => s.some((k) => uploaded.has(k)));

  return (
    <>
      <div className="pagehead">
        <div>
          <Link href={appHref("/kyc")} className="back">← My KYC</Link>
          <h1>{e.legalName}</h1>
          <span className="small muted">{e.type} · PAN {e.panMasked ?? "—"} · GSTIN {e.gstinMasked ?? (e.gstRegistered ? "—" : "not registered")} {e.regNo && `· ${e.regNo}`}</span>
        </div>
        <KycPill status={e.status} />
      </div>
      {e.status === "pending_review" && <div className="note">Submitted. Documents are with an Excro reviewer.</div>}
      {e.status === "verified" && <div className="note ok">Verified. You can fill deal roles as this entity.</div>}

      <div className="cols">
        <div className="card">
          <h3>Documents</h3>
          <p className="small muted">Other deal parties never see these; only Excro reviewers do.</p>
          {slots.map((s) => (
            <div key={s.join()} className="check">
              <span className={`dot ${s.some((k) => uploaded.has(k)) ? "d-ok" : "d-wait"}`} />
              <div>{s.map(docLabel).join(" or ")}</div>
              {s.some((k) => uploaded.has(k)) ? <CheckPill status="uploaded" /> : <span className="pill p-warn">Required</span>}
            </div>
          ))}
          <div className="check">
            <span className={`dot ${AUTHORITY.some((k) => uploaded.has(k)) ? "d-ok" : "d-wait"}`} />
            <div>Signatory authority<br /><span className="muted small">Board resolution or authorisation letter, unless you’re a director/partner on the MCA record.</span></div>
            {AUTHORITY.some((k) => uploaded.has(k)) ? <CheckPill status="uploaded" /> : <span className="pill p-mute">If needed</span>}
          </div>
          {editable && <DocUpload partyId={partyId} kinds={[...new Set([...slots.flat(), ...AUTHORITY, "address_proof"])]} onDone={v.reload} />}
        </div>

        <div>
          {NEEDS_UBO.includes(e.type) && (
            <div className="card">
              <h3>Beneficial owners (10% or more)</h3>
              {e.beneficialOwners.length > 0 ? (
                <ul className="tight small">{e.beneficialOwners.map((o) => <li key={o.pan}>{o.fullName} · <span className="mono">{o.pan}</span> · {o.sharePct}%</li>)}</ul>
              ) : <p className="small muted">None declared yet.</p>}
              {editable && <UboForm partyId={partyId} onDone={v.reload} />}
            </div>
          )}
          <div className="card">
            <h3>Entity bank account</h3>
            <p className="small muted">Must be in the entity’s own name, not the signatory’s.</p>
            {e.bankAccounts.map((b) => (
              <div key={b.id} className="check"><span className={`dot ${b.status === "verified" ? "d-ok" : "d-bad"}`} /><div><span className="mono">{b.accountMasked}</span> · {b.ifsc}</div><CheckPill status={b.status} /></div>
            ))}
            {e.status !== "rejected" && <EntityBank partyId={partyId} onDone={v.reload} />}
          </div>
        </div>
      </div>

      {editable && <SubmitEntity partyId={partyId} ready={docsOk} onDone={v.reload} />}
    </>
  );
}

function DocUpload({ partyId, kinds, onDone }: { partyId: string; kinds: string[]; onDone: () => void }) {
  const [kind, setKind] = useState(kinds[0]!);
  const [file, setFile] = useState<File | null>(null);
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      // Mock mode keeps a reference only; real Blob upload (immutable storage) arrives with the Azure build.
      await api(`/v1/kyc/${partyId}/documents`, { body: { kind, reference: `local:${file?.name ?? `${kind}.pdf`}` } });
      setFile(null);
      onDone();
    });
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="grid-form">
        <Field label="Document type"><select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k} value={k}>{docLabel(k)}</option>)}</select></Field>
        <Field label="File" hint="Mock mode records the file name only."><input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      </div>
      <ErrorNote error={a.error} />
      <button className="btn ghost sm" disabled={a.busy}>Upload</button>
    </form>
  );
}

function UboForm({ partyId, onDone }: { partyId: string; onDone: () => void }) {
  const [rows, setRows] = useState([{ fullName: "", pan: "", sharePct: "" }]);
  const [none, setNone] = useState(false);
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const owners = none ? [] : rows.filter((r) => r.fullName).map((r) => ({ fullName: r.fullName, pan: r.pan.toUpperCase(), sharePct: Number(r.sharePct) }));
      await api(`/v1/kyc/entity/${partyId}/beneficial-owners`, { body: { owners, noneAbove10Percent: none } });
      onDone();
    });
  };
  return (
    <form onSubmit={submit}>
      <label className="check-row">
        <input type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} />
        No one holds 10% or more
      </label>
      {!none && rows.map((r, i) => (
        <div key={i} className="grid-form">
          <Field label="Name"><input value={r.fullName} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, fullName: e.target.value } : x)))} /></Field>
          <Field label="PAN"><input className="mono" value={r.pan} maxLength={10} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pan: e.target.value.toUpperCase() } : x)))} /></Field>
          <Field label="Share %"><input inputMode="decimal" value={r.sharePct} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sharePct: e.target.value } : x)))} /></Field>
        </div>
      ))}
      <ErrorNote error={a.error} />
      <div className="row">
        {!none && <button type="button" className="btn ghost sm" onClick={() => setRows([...rows, { fullName: "", pan: "", sharePct: "" }])}>Add owner</button>}
        <button className="btn sm" disabled={a.busy}>Save declaration</button>
      </div>
    </form>
  );
}

function EntityBank({ partyId, onDone }: { partyId: string; onDone: () => void }) {
  const [acct, setAcct] = useState("");
  const [ifsc, setIfsc] = useState("");
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const r = await api<{ status: string }>(`/v1/kyc/entity/${partyId}/bank-account`, { body: { accountNumber: acct, ifsc } });
      if (r.status !== "verified") a.setError(new Error("Penny-drop failed or the holder name isn't the entity's name."));
      setAcct("");
      onDone();
    });
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 8 }}>
      <div className="grid-form">
        <Field label="Account number"><input className="mono" inputMode="numeric" value={acct} onChange={(e) => setAcct(e.target.value)} required /></Field>
        <Field label="IFSC"><input className="mono" value={ifsc} maxLength={11} onChange={(e) => setIfsc(e.target.value.toUpperCase())} required /></Field>
      </div>
      <ErrorNote error={a.error} />
      <button className="btn ghost sm" disabled={a.busy}>Verify account</button>
    </form>
  );
}

function SubmitEntity({ partyId, ready, onDone }: { partyId: string; ready: boolean; onDone: () => void }) {
  const go = useGo();
  const a = useAction();
  return (
    <div className="card">
      <h3>Submit for review</h3>
      <p className="small muted">Your own individual KYC must already be verified. Screening runs on the entity, you, listed officers and beneficial owners.</p>
      <ErrorNote error={a.error} />
      <div className="row">
        <button className="btn" disabled={a.busy} onClick={() => void a.run(async () => { await api(`/v1/kyc/entity/${partyId}/submit`, { method: "POST" }); onDone(); })}>Submit entity KYC</button>
        {!ready && <span className="small muted">Some required documents are still missing.</span>}
        <button className="btn ghost" onClick={() => go("/kyc")}>Back</button>
      </div>
    </div>
  );
}
