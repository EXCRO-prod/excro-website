"use client";

// Step 0 of every deal (spec 13): who the parties are, their roles, deposit shares, broker fee and
// the Excro commission plan (spec 14, default zero). The server runs the same structural validator
// that gates signing, so anything accepted here can't be rejected at signing for its shape.
import { useEffect, useState, type FormEvent } from "react";
import { api, ROLES, type Account, type Role } from "../api";
import { ErrorNote, Field, ROLE_LABEL, rupeesToMinor, useAction, useGo } from "../ui";

interface PartyDraft { ref: string; role: Role; label: string; mobile: string; email: string; share: string; feeKind: "bps" | "fixed"; fee: string }

/** "1.25" → 125 bps, exactly. Null when not a percentage with at most 2 decimals. */
function toBps(text: string): number | null {
  const m = text.trim().match(/^(\d{1,3})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const v = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return v <= 10_000 ? v : null;
}

const isPayer = (r: Role) => r === "payer" || r === "payer_payee";
const blank = (n: number, role: Role): PartyDraft => ({ ref: `p${n}`, role, label: "", mobile: "", email: "", share: role === "payer" ? "100" : "", feeKind: "bps", fee: "" });

interface CommissionDraft {
  type: "none" | "fixed" | "bps";
  fixed: string;
  pct: string;
  min: string;
  max: string;
  gstMode: "exclusive" | "inclusive";
  gstPct: string;
  payers: Record<string, string>;
  collect: "at_funding" | "at_release" | "outside_escrow";
  onFailure: "refundable" | "non_refundable" | "refundable_except_fixed";
  keepFixed: string;
}
const NO_COMMISSION: CommissionDraft = { type: "none", fixed: "", pct: "", min: "", max: "", gstMode: "exclusive", gstPct: "0", payers: {}, collect: "at_release", onFailure: "refundable", keepFixed: "" };

export function NewDealPage() {
  const go = useGo();
  const [me, setMe] = useState<Account | null>(null);
  const [parties, setParties] = useState<PartyDraft[]>([blank(1, "payer"), blank(2, "payee")]);
  const [c, setC] = useState<CommissionDraft>(NO_COMMISSION);
  const a = useAction();

  useEffect(() => {
    api<Account>("/v1/accounts/me").then((acc) => {
      setMe(acc);
      // The person creating the deal must be one of its parties; start them in the first row.
      setParties((ps) => ps.map((p, i) => (i === 0 && !p.mobile ? { ...p, mobile: acc.mobile, email: acc.email } : p)));
    }, a.setError);
  }, [a.setError]);

  const update = (i: number, patch: Partial<PartyDraft>) => setParties(parties.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const nextRef = () => `p${Math.max(0, ...parties.map((p) => Number(p.ref.slice(1)) || 0)) + 1}`;

  const loadSample = () => {
    if (!me) return;
    setParties([
      { ref: "buyer", role: "payer", label: "Nirmal Traders", mobile: me.mobile, email: me.email, share: "100", feeKind: "bps", fee: "" },
      { ref: "seller", role: "payee", label: "Kavya Electronics Pvt Ltd", mobile: "9111111111", email: "kavya@example.com", share: "", feeKind: "bps", fee: "" },
      { ref: "broker", role: "fee_payee", label: "Aman Mehta", mobile: "9222222222", email: "aman@example.com", share: "", feeKind: "bps", fee: "1" },
    ]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const body = {
        parties: parties.map((p) => {
          const out: Record<string, unknown> = { ref: p.ref, role: p.role, label: p.label.trim(), mobile: p.mobile, email: p.email };
          if (isPayer(p.role)) {
            const s = toBps(p.share);
            if (s === null) throw new Error(`${p.label || p.ref}: deposit share must be a percentage`);
            out.depositShareBps = s;
          }
          if (p.role === "fee_payee" && p.fee) {
            if (p.feeKind === "bps") {
              const b = toBps(p.fee);
              if (b === null) throw new Error(`${p.label || p.ref}: fee must be a percentage`);
              out.feeRule = { bps: b };
            } else {
              const m = rupeesToMinor(p.fee);
              if (m === null) throw new Error(`${p.label || p.ref}: fee must be a rupee amount`);
              out.feeRule = { fixedMinor: m };
            }
          }
          return out;
        }),
        ...(c.type === "none" ? {} : { commission: commissionBody(c) }),
      };
      const r = await api<{ dealId: string }>("/v1/deals", { body });
      go(`/deals/${r.dealId}`);
    });
  };

  const payerTotal = parties.filter((p) => isPayer(p.role)).reduce((s, p) => s + (toBps(p.share) ?? 0), 0);

  return (
    <form onSubmit={submit}>
      <div className="pagehead">
        <div>
          <div className="eyebrow">New deal · step 0</div>
          <h1>Who is in this escrow?</h1>
        </div>
        <button type="button" className="btn ghost sm" onClick={loadSample} disabled={!me}>Load sample parties</button>
      </div>
      <p className="muted small">2 to 10 parties. Everyone needs an Excro account and Excro-verified KYC. You can review terms while KYC completes; no one can sign and no escrow account opens until every party is verified.</p>

      <div className="card">
        <h2>Parties</h2>
        {parties.map((p, i) => (
          <div key={p.ref} className="party">
            <div className="party-h">
              <b>{p.label || `Party ${i + 1}`}{me && p.mobile.replace(/\D/g, "").endsWith(me.mobile.slice(-10)) && <span className="pill p-acc" style={{ marginLeft: 8 }}>you</span>}</b>
              {parties.length > 2 && <button type="button" className="btn ghost sm" onClick={() => setParties(parties.filter((_, j) => j !== i))}>Remove</button>}
            </div>
            <div className="grid-form">
              <Field label="Role">
                <select value={p.role} onChange={(e) => update(i, { role: e.target.value as Role })}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </Field>
              <Field label="Name shown in the deal"><input value={p.label} onChange={(e) => update(i, { label: e.target.value })} required /></Field>
              <Field label="Mobile"><input inputMode="tel" value={p.mobile} onChange={(e) => update(i, { mobile: e.target.value })} required /></Field>
              <Field label="Email"><input type="email" value={p.email} onChange={(e) => update(i, { email: e.target.value })} required /></Field>
              {isPayer(p.role) && <Field label="Deposit share %" hint="Co-buyers' shares total 100%."><input inputMode="decimal" value={p.share} onChange={(e) => update(i, { share: e.target.value })} required /></Field>}
              {p.role === "fee_payee" && (
                <Field group label={p.feeKind === "bps" ? "Fee, % of seller release" : "Fee, fixed ₹"} hint={<button type="button" className="code-chip" onClick={() => update(i, { feeKind: p.feeKind === "bps" ? "fixed" : "bps", fee: "" })}>switch to {p.feeKind === "bps" ? "fixed ₹" : "%"}</button>}>
                  <input inputMode="decimal" value={p.fee} onChange={(e) => update(i, { fee: e.target.value })} />
                </Field>
              )}
            </div>
          </div>
        ))}
        <div className="row">
          {parties.length < 10 && <button type="button" className="btn ghost sm" onClick={() => setParties([...parties, blank(Number(nextRef().slice(1)), "observer")])}>Add party</button>}
          <span className="small muted">Deposit shares: {(payerTotal / 100).toFixed(2)}% {payerTotal === 10_000 ? "✓" : "(must total 100%)"}</span>
        </div>
      </div>

      <CommissionEditor c={c} setC={setC} parties={parties} />

      <ErrorNote error={a.error} />
      <div className="row end">
        <button type="button" className="btn ghost" onClick={() => go("/deals")}>Cancel</button>
        <button className="btn" disabled={a.busy}>Create deal and send invites</button>
      </div>
    </form>
  );
}

function commissionBody(c: CommissionDraft) {
  const need = <T,>(v: T | null, what: string): T => {
    if (v === null) throw new Error(`Excro commission: ${what}`);
    return v;
  };
  const amount =
    c.type === "fixed"
      ? { type: "fixed", minor: need(rupeesToMinor(c.fixed), "enter a rupee amount") }
      : {
          type: "bps",
          bps: need(toBps(c.pct), "enter a percentage"),
          ...(c.min ? { minMinor: need(rupeesToMinor(c.min), "minimum must be a rupee amount") } : {}),
          ...(c.max ? { maxMinor: need(rupeesToMinor(c.max), "maximum must be a rupee amount") } : {}),
        };
  const payers = Object.entries(c.payers).filter(([, v]) => v.trim()).map(([ref, v]) => ({ ref, shareBps: need(toBps(v), "payer shares must be percentages") }));
  return { amount, gst: { mode: c.gstMode, rateBps: need(toBps(c.gstPct || "0"), "GST rate must be a percentage") }, payers, collect: c.collect, onFailure: c.onFailure,
    ...(c.onFailure === "refundable_except_fixed" ? { nonRefundableFixedMinor: need(rupeesToMinor(c.keepFixed), "enter the non-refundable fixed part in ₹") } : {}) };
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <button type="button" key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

function CommissionEditor({ c, setC, parties }: { c: CommissionDraft; setC: (c: CommissionDraft) => void; parties: PartyDraft[] }) {
  const set = (patch: Partial<CommissionDraft>) => setC({ ...c, ...patch });
  const eligible = parties.filter((p) => p.role === "payer" || p.role === "payee" || p.role === "payer_payee");
  return (
    <div className="card">
      <h2>Excro commission</h2>
      <p className="small muted">Default is zero. A non-zero fee leaves escrow only as a line in the signed schedule’s commission plan.</p>
      <Seg value={c.type} onChange={(type) => set({ type })} options={[["none", "No commission"], ["bps", "% of deal value"], ["fixed", "Fixed amount"]]} />
      {c.type !== "none" && (
        <>
          <div className="grid-form">
            {c.type === "fixed" ? (
              <Field label="Amount ₹"><input inputMode="decimal" value={c.fixed} onChange={(e) => set({ fixed: e.target.value })} required /></Field>
            ) : (
              <>
                <Field label="Rate %"><input inputMode="decimal" value={c.pct} onChange={(e) => set({ pct: e.target.value })} required /></Field>
                <Field label="Minimum ₹ (optional)"><input inputMode="decimal" value={c.min} onChange={(e) => set({ min: e.target.value })} /></Field>
                <Field label="Maximum ₹ (optional)"><input inputMode="decimal" value={c.max} onChange={(e) => set({ max: e.target.value })} /></Field>
              </>
            )}
            <Field label="GST rate %" hint="Placeholder until Excro's CA confirms the rate."><input inputMode="decimal" value={c.gstPct} onChange={(e) => set({ gstPct: e.target.value })} /></Field>
          </div>
          <Field group label="GST"><Seg value={c.gstMode} onChange={(gstMode) => set({ gstMode })} options={[["exclusive", "Added on top"], ["inclusive", "Included"]]} /></Field>
          <Field group label="Who pays, and what share">
            <div className="grid-form">
              {eligible.map((p) => (
                <Field key={p.ref} label={`${p.label || p.ref} %`}>
                  <input inputMode="decimal" value={c.payers[p.ref] ?? ""} onChange={(e) => set({ payers: { ...c.payers, [p.ref]: e.target.value } })} />
                </Field>
              ))}
            </div>
          </Field>
          <Field group label="Collected">
            <Seg value={c.collect} onChange={(collect) => set({ collect })} options={[["at_funding", "At funding"], ["at_release", "At release"], ["outside_escrow", "Outside escrow"]]} />
          </Field>
          <Field group label="If the deal fails">
            <Seg value={c.onFailure} onChange={(onFailure) => set({ onFailure })} options={[["refundable", "Refundable"], ["non_refundable", "Non-refundable"], ["refundable_except_fixed", "Refundable except a fixed part"]]} />
          </Field>
          {c.onFailure === "refundable_except_fixed" && <Field label="Non-refundable fixed part ₹"><input inputMode="decimal" value={c.keepFixed} onChange={(e) => set({ keepFixed: e.target.value })} required /></Field>}
          {c.collect === "at_funding" && c.onFailure === "refundable" && <div className="note warn">Collecting at funding can’t be fully refundable; the validator will reject this combination.</div>}
        </>
      )}
    </div>
  );
}
