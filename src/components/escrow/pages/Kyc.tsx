"use client";

// "My KYC" (spec 13): the signed-in person's individual KYC, then any entities they sign for.
// KYC belongs to the party and is reused across deals. The UI never asks for an Aadhaar number:
// Aadhaar comes from the provider's offline/DigiLocker flow and only the masked last 4 is ever shown.
import { useState, type FormEvent } from "react";
import { api, type EntitySummary, type KycView } from "../api";
import { CheckPill, ErrorNote, Field, KycPill, useAction, useLoad, useGo } from "../ui";
import { NewEntityForm } from "./EntityKyc";

type Mine = KycView | { status: "not_started" };
const started = (k: Mine | undefined): k is KycView => !!k && "partyId" in k;

export function KycPage() {
  const go = useGo();
  const me = useLoad(() => api<Mine>("/v1/kyc/me"), []);
  const ents = useLoad(() => api<EntitySummary[]>("/v1/kyc/entities"), []);
  const [addingEntity, setAddingEntity] = useState(false);
  const reload = () => { me.reload(); ents.reload(); };

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Spec 13 · reused across every deal</div>
          <h1>My KYC</h1>
        </div>
      </div>
      <ErrorNote error={me.error} />
      {me.data && <IndividualKyc kyc={me.data} onChange={reload} />}

      <div className="card">
        <div className="pagehead" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Entities you sign for</h2>
          {started(me.data) && !addingEntity && <button className="btn ghost sm" onClick={() => setAddingEntity(true)}>Add company, LLP, firm or trust</button>}
        </div>
        <p className="muted small">A deal role can be filled by a business. You must complete your own individual KYC first: you are recorded as its signatory.</p>
        {addingEntity && <NewEntityForm onDone={(id) => { setAddingEntity(false); if (id) go(`/kyc/entity/${id}`); else reload(); }} />}
        {ents.data && ents.data.length > 0 ? (
          <div className="tbl">
            <table>
              <thead><tr><th>Entity</th><th>Type</th><th>KYC</th></tr></thead>
              <tbody>
                {ents.data.map((e) => (
                  <tr key={e.partyId} className="link" onClick={() => go(`/kyc/entity/${e.partyId}`)}>
                    <td><b>{e.legalName}</b></td><td>{e.type}</td><td><KycPill status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (!addingEntity && <p className="small muted">No entities yet.</p>)}
      </div>
    </>
  );
}

const STEP_NAMES = ["PAN", "Aadhaar", "Bank account", "Submit"];

function IndividualKyc({ kyc, onChange }: { kyc: Mine; onChange: () => void }) {
  const status = kyc.status;
  const k = started(kyc) ? kyc : undefined;
  const check = (kind: string) => k?.checks.find((c) => c.kind === kind)?.status;
  const panOk = check("pan") === "pass";
  const aadhaarDone = !!check("aadhaar");
  const bankOk = !!k?.bankAccounts.some((b) => b.status === "verified");
  const restart = status === "not_started" || status === "rejected" || status === "expired" || (status === "in_progress" && !panOk);
  const step = restart ? 0 : !aadhaarDone ? 1 : !bankOk ? 2 : 3;
  const editable = status === "in_progress" || restart;

  return (
    <div className="card">
      <div className="pagehead" style={{ marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>{k?.legalName ?? "Individual KYC"}</h2>
          <span className="small muted">Individual · PAN {k?.panMasked ?? "—"} · Aadhaar {k?.aadhaarMasked ?? "—"}</span>
        </div>
        <KycPill status={status} />
      </div>

      {editable && (
        <div className="steps">
          {STEP_NAMES.map((s, i) => <span key={s} className={i < step ? "done" : i === step ? "on" : ""}>{i + 1}. {s}</span>)}
        </div>
      )}

      {status === "pending_review" && <div className="note">Submitted. An Excro reviewer is checking your details; you’ll be notified. You can keep reviewing deal terms meanwhile, but no one can sign until every party is verified.</div>}
      {status === "verified" && <div className="note ok">Verified. This KYC is reused for every Excro deal you join.</div>}
      {status === "rejected" && <div className="note bad">Your KYC was not approved. Start again with your PAN; earlier attempts stay on record.</div>}

      {editable && step === 0 && <PanStep onDone={onChange} failed={check("pan")} />}
      {editable && step === 1 && <AadhaarStep onDone={onChange} />}
      {editable && step === 2 && <BankStep onDone={onChange} />}
      {editable && step === 3 && <SubmitStep onDone={onChange} />}

      {k && (
        <div className="cols" style={{ marginTop: 12 }}>
          <div className="panel">
            <h4>Checks</h4>
            {k.checks.length === 0 ? <p className="small muted">None yet.</p> : k.checks.map((c) => (
              <div key={c.kind} className="check"><span className={`dot ${c.status === "pass" ? "d-ok" : c.status === "review" ? "d-warn" : "d-bad"}`} /><div>{c.kind}</div><CheckPill status={c.status} /></div>
            ))}
          </div>
          <div className="panel">
            <h4>Bank accounts (penny-drop)</h4>
            {k.bankAccounts.length === 0 ? <p className="small muted">None yet.</p> : k.bankAccounts.map((b) => (
              <div key={b.id} className="check"><span className={`dot ${b.status === "verified" ? "d-ok" : "d-bad"}`} /><div><span className="mono">{b.accountMasked}</span> · {b.ifsc}{b.holderName && <><br /><span className="muted small">Holder: {b.holderName}</span></>}</div><CheckPill status={b.status} /></div>
            ))}
            {status === "verified" && <BankStep onDone={onChange} compact />}
          </div>
        </div>
      )}
    </div>
  );
}

function PanStep({ onDone, failed }: { onDone: () => void; failed?: string }) {
  const [pan, setPan] = useState("");
  const [fullName, setFullName] = useState("");
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const r = await api<{ panVerified: boolean }>("/v1/kyc/individual", { body: { pan, fullName } });
      if (!r.panVerified) a.setError(new Error("PAN name did not match closely enough. Check the spelling exactly as on your PAN card, or it will go to review."));
      onDone();
    });
  };
  return (
    <form onSubmit={submit}>
      {failed && failed !== "pass" && <div className="note warn">Your last PAN check came back <b>{failed}</b>. Re-enter it exactly as printed.</div>}
      <div className="grid-form">
        <Field label="PAN" hint="Individual PAN; the fourth letter is P."><input className="mono" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} required /></Field>
        <Field label="Full name as on PAN"><input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></Field>
      </div>
      <ErrorNote error={a.error} />
      <button className="btn" disabled={a.busy}>Verify PAN</button>
    </form>
  );
}

function AadhaarStep({ onDone }: { onDone: () => void }) {
  const a = useAction();
  const [consent, setConsent] = useState(false);
  const fetchAadhaar = () =>
    a.run(async () => {
      // The consent reference stands in for the DigiLocker handshake; no Aadhaar number passes through Excro's UI.
      await api("/v1/kyc/individual/aadhaar", { body: { consentRef: `digilocker-mock-${crypto.randomUUID()}` } });
      onDone();
    });
  return (
    <div>
      <p className="small">Excro fetches your Aadhaar details through DigiLocker with your consent. We keep only the last 4 digits; the full number is never stored.</p>
      <label className="check-row">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I consent to Excro fetching my Aadhaar offline e-KYC via DigiLocker (mock).
      </label>
      <ErrorNote error={a.error} />
      <button className="btn" disabled={!consent || a.busy} onClick={() => void fetchAadhaar()}>Continue with DigiLocker</button>
    </div>
  );
}

function BankStep({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const [acct, setAcct] = useState("");
  const [ifsc, setIfsc] = useState("");
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const r = await api<{ status: string }>("/v1/kyc/individual/bank-account", { body: { accountNumber: acct, ifsc } });
      if (r.status !== "verified") a.setError(new Error("Penny-drop failed or the account holder's name did not match. Use an account in your own name."));
      setAcct("");
      onDone();
    });
  };
  return (
    <form onSubmit={submit} style={compact ? { marginTop: 10 } : undefined}>
      {!compact && <p className="small">Needed for anyone who pays or receives money. We send ₹1 to confirm the account is yours.</p>}
      <div className="grid-form">
        <Field label="Account number"><input className="mono" inputMode="numeric" value={acct} onChange={(e) => setAcct(e.target.value)} required /></Field>
        <Field label="IFSC"><input className="mono" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} maxLength={11} required /></Field>
      </div>
      <ErrorNote error={a.error} />
      <button className={compact ? "btn ghost sm" : "btn"} disabled={a.busy}>{compact ? "Add another account" : "Verify bank account"}</button>
    </form>
  );
}

function SubmitStep({ onDone }: { onDone: () => void }) {
  const a = useAction();
  const [result, setResult] = useState<{ status: string; reasons: string[] } | null>(null);
  return (
    <div>
      <p className="small">We’ll run sanctions screening and finish. Clean results verify immediately; anything else goes to an Excro reviewer.</p>
      {result && result.reasons.length > 0 && <div className="note warn">Sent to review: {result.reasons.join(", ")}</div>}
      <ErrorNote error={a.error} />
      <button className="btn" disabled={a.busy} onClick={() => void a.run(async () => { setResult(await api("/v1/kyc/individual:submit", { method: "POST" })); onDone(); })}>Submit KYC</button>
    </div>
  );
}
