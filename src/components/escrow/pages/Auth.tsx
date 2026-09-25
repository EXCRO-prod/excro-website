"use client";

// Excro account sign-up / sign-in (mobile + email OTP, spec 13) and staff sign-in (mock MFA).
// Each successful sign-in is added to the "acting as" list rather than replacing it.
import { useState, type FormEvent } from "react";
import { api, session, type Account } from "../api";
import { ErrorNote, Field, useAction, useGo } from "../ui";

type Mode = "signin" | "signup" | "staff";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  return (
    <section className="hero">
      <div className="blob b1" aria-hidden="true" />
      <div className="blob b2" aria-hidden="true" />
      <div className="hero-in">
        <div>
          <div className="badge"><i />Conditional Release escrow</div>
          <h1>
            Money moves only when
            <br />
            <span className="gradient-text">the conditions are met</span>
          </h1>
          <p className="lede">Funds sit in a bank escrow account. They’re released only against a Release Schedule every party has e-signed, with each condition checked against real evidence.</p>
          <div className="trust">
            <span>Bank-held funds</span>
            <span>Every party KYC-verified</span>
            <span>Tamper-evident audit trail</span>
          </div>
        </div>
        <div className="card auth-card">
          <h2>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create your Excro account" : "Excro staff sign-in"}</h2>
          <p className="muted small">Every party needs their own account. Codes arrive by SMS and email; in local mock mode, open the <b>Outbox</b> (bottom right) to read them.</p>
          <div className="seg" role="group" aria-label="Sign-in type">
            {(["signin", "signup", "staff"] as Mode[]).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === "signin" ? "Sign in" : m === "signup" ? "Create account" : "Staff"}
              </button>
            ))}
          </div>
          {mode === "signin" ? <SignIn /> : mode === "signup" ? <SignUp /> : <StaffSignIn />}
        </div>
      </div>
    </section>
  );
}

async function addParty(token: string, go: (path: string) => void) {
  const me = await api<Account>("/v1/accounts/me", { token });
  session.add({ key: `party:${me.id}`, kind: "party", label: me.email, token });
  go("/deals");
}

function SignIn() {
  const go = useGo();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      if (!sent) {
        await api("/v1/auth/login:request-otp", { body: { mobile }, token: null });
        setSent(true);
      } else {
        const r = await api<{ token: string }>("/v1/auth/login:verify", { body: { mobile, code }, token: null });
        await addParty(r.token, go);
      }
    });
  };
  return (
    <form onSubmit={submit}>
      <Field label="Mobile number">
        <input inputMode="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" disabled={sent} required />
      </Field>
      {sent && (
        <Field label="Code sent to your mobile" hint="If this mobile has an Excro account, a code was sent.">
          <input className="mono" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
        </Field>
      )}
      <ErrorNote error={a.error} />
      <div className="row">
        <button className="btn" disabled={a.busy}>{sent ? "Sign in" : "Send code"}</button>
        {sent && <button type="button" className="btn ghost" onClick={() => { setSent(false); setCode(""); }}>Change number</button>}
      </div>
    </form>
  );
}

function SignUp() {
  const go = useGo();
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [codes, setCodes] = useState({ mobile: "", email: "" });
  const [done, setDone] = useState({ mobile: false, email: false });
  const a = useAction();

  const start = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      await api("/v1/accounts/signup", { body: { mobile, email }, token: null });
      setStarted(true);
    });
  };
  const verify = (channel: "mobile" | "email") =>
    a.run(async () => {
      const r = await api<{ mobileVerified: boolean; emailVerified: boolean; token?: string }>("/v1/accounts/signup:verify", { body: { mobile, channel, code: codes[channel] }, token: null });
      setDone({ mobile: r.mobileVerified, email: r.emailVerified });
      if (r.token) await addParty(r.token, go);
    });

  if (!started)
    return (
      <form onSubmit={start}>
        <Field label="Mobile number"><input inputMode="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required /></Field>
        <Field label="Email"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <ErrorNote error={a.error} />
        <button className="btn" disabled={a.busy}>Send codes</button>
      </form>
    );

  return (
    <div>
      <p className="small muted">We sent one code to <b>{mobile}</b> and another to <b>{email}</b>. Verify both to finish.</p>
      {(["mobile", "email"] as const).map((ch) => (
        <form key={ch} className="row" style={{ alignItems: "flex-end", marginBottom: 8 }} onSubmit={(e) => { e.preventDefault(); void verify(ch); }}>
          <div style={{ flex: 1 }}>
            <Field label={ch === "mobile" ? "Mobile code" : "Email code"}>
              <input className="mono" inputMode="numeric" value={codes[ch]} onChange={(e) => setCodes({ ...codes, [ch]: e.target.value })} disabled={done[ch]} />
            </Field>
          </div>
          <div style={{ marginBottom: 12 }}>
            {done[ch] ? <span className="pill p-ok">Verified</span> : <button className="btn sm" disabled={a.busy || !codes[ch]}>Verify</button>}
          </div>
        </form>
      ))}
      <ErrorNote error={a.error} />
    </div>
  );
}

const STAFF = ["ops.maker@excro.local", "ops.checker@excro.local", "ops.admin@excro.local"];

function StaffSignIn() {
  const go = useGo();
  const [email, setEmail] = useState(STAFF[0]!);
  const [mfa, setMfa] = useState("");
  const a = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void a.run(async () => {
      const r = await api<{ token: string; staffId: string }>("/v1/staff/login", { body: { email, mfaCode: mfa }, token: null });
      session.add({ key: `staff:${r.staffId}`, kind: "staff", label: `Ops · ${email.split("@")[0]}`, token: r.token });
      go("/ops");
    });
  };
  return (
    <form onSubmit={submit}>
      <Field label="Staff user" hint="Seeded local staff. Maker and checker must be two different people.">
        <select value={email} onChange={(e) => setEmail(e.target.value)}>{STAFF.map((s) => <option key={s}>{s}</option>)}</select>
      </Field>
      <Field label="MFA code" hint={<>Mock MFA: <code>MOCK_MFA_CODE</code>, default 000000.</>}>
        <input className="mono" inputMode="numeric" value={mfa} onChange={(e) => setMfa(e.target.value)} required />
      </Field>
      <ErrorNote error={a.error} />
      <button className="btn" disabled={a.busy}>Sign in as staff</button>
    </form>
  );
}
