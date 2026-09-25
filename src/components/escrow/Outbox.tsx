"use client";

// Dev-only drawer showing what the MockNotifier "sent": OTP codes and deal invite codes. It stands in
// for the phone and inbox so one person can run every side of a deal locally.
import { useEffect, useState } from "react";
import { api, type OutboxMessage } from "./api";
import { when } from "./ui";

// Codes are on their own whitespace-delimited token in the message body (see deals/service.ts invites).
const OTP_RE = /\b(\d{6})\b/;
const INVITE_RE = /invite code:\s*\n?(\S+)/;
const DEAL_RE = /escrow deal (EX-\d{4}-\d+)/;

export function Outbox() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<OutboxMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const load = () => api<OutboxMessage[]>("/v1/dev/outbox", { token: null }).then((m) => { if (live) { setMsgs(m); setError(null); } }, (e: Error) => live && setError(e.message));
    void load();
    const t = setInterval(load, 2500);
    return () => { live = false; clearInterval(t); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const copy = (v: string) => {
    void navigator.clipboard?.writeText(v).catch(() => undefined);
    setCopied(v);
    setTimeout(() => setCopied(null), 1200);
  };
  const Chip = ({ v }: { v: string }) => <button type="button" className="code-chip" onClick={() => copy(v)} title="Copy">{copied === v ? "copied" : v}</button>;

  if (!open) return <button className="btn drawer-tab" onClick={() => setOpen(true)}>Outbox (mock SMS / email)</button>;
  return (
    <>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className="drawer" aria-label="Mock outbox">
        <header>
          <b>Mock outbox</b>
          <button className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
        </header>
        <div className="body">
          <p className="small muted">Local mock mode only. Real deployments send these by SMS and email. Click a code to copy it.</p>
          {error && <div className="note bad">{error}</div>}
          {msgs.length === 0 && !error && <p className="small muted">Nothing sent yet.</p>}
          {msgs.map((m) => {
            const invite = m.body.match(INVITE_RE)?.[1];
            const deal = m.body.match(DEAL_RE)?.[1];
            const otp = !invite ? m.body.match(OTP_RE)?.[1] : undefined;
            return (
              <div key={m.id} className="msg">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="mono small"><b>{m.channel}</b> → {m.to}</span>
                  <span className="muted small">{when(m.at)}</span>
                </div>
                <div className="row small" style={{ marginTop: 4 }}>
                  {otp && <>Code <Chip v={otp} /></>}
                  {deal && <>Deal <Chip v={deal} /></>}
                  {invite && <>Invite <Chip v={invite} /></>}
                </div>
                <pre>{m.body}</pre>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
