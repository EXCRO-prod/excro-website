"use client";

// The Excro platform inside the website (/app): a sub-bar under the website navbar with the section
// nav and the "acting as" switcher (one browser can hold several sessions so a person can demo every
// side of a deal), a sign-in gate, and the dev-only outbox. Theme comes from the website's toggle.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { session } from "./api";
import { Outbox } from "./Outbox";
import { AuthPage } from "./pages/Auth";
import { DealsPage } from "./pages/Deals";
import { OpsPage } from "./pages/Ops";
import { appHref, useGo, useIdentities, useIdentity, useMounted } from "./ui";

export function EscrowShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const who = useIdentity();
  const all = useIdentities();
  const go = useGo();

  // Sessions live in this browser only, so nothing session-dependent renders on the server.
  const body = !mounted ? <p className="muted">Loading…</p> : !who || pathname === appHref("/signin") ? <AuthPage /> : children;

  const navLink = (path: string, label: string) => {
    const href = appHref(path);
    return (
      <Link href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>
        {label}
      </Link>
    );
  };

  return (
    <div className="xa">
      <div className="appbar">
        <div className="appbar-in">
          <Link className="brand" href={appHref("/")}>
            Excro Platform
            <span className="tag">Conditional Release</span>
          </Link>
          {mounted && who && (
            <nav className="nav">{who.kind === "party" ? <>{navLink("/deals", "Deals")}{navLink("/kyc", "My KYC")}</> : navLink("/ops", "Ops console")}</nav>
          )}
          <span className="spacer" />
          {mounted && all.length > 0 && (
            <label className="acting">
              <span>Acting as</span>
              <select value={who?.key ?? ""} onChange={(e) => (e.target.value === "+" ? go("/signin") : session.switchTo(e.target.value))}>
                {!who && <option value="">—</option>}
                {all.map((i) => (
                  <option key={i.key} value={i.key}>{i.label}</option>
                ))}
                <option value="+">+ Sign in another person…</option>
              </select>
            </label>
          )}
          {mounted && who?.kind === "party" && pathname !== appHref("/deals/new") && (
            <button className="btn sm" onClick={() => go("/deals/new")}>New deal</button>
          )}
          {mounted && who && (
            <button className="btn ghost sm" onClick={() => session.remove(who.key)}>Sign out</button>
          )}
        </div>
      </div>
      <div className="xa-main">{body}</div>
      {process.env.NODE_ENV !== "production" && mounted && <Outbox />}
    </div>
  );
}

/** /app itself: parties land on their deals, staff on the Ops console. */
export function AppHome() {
  const who = useIdentity();
  return who?.kind === "staff" ? <OpsPage /> : <DealsPage />;
}
