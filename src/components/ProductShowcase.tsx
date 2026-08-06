"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { PRODUCT_TABS } from "@/lib/constants";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Code2,
  CreditCard,
  FileText,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

const TAB_CONTENT: Record<string, { title: string; rows: { label: string; value: string; status?: string }[] }> = {
  Transactions: {
    title: "Recent Transactions",
    rows: [
      { label: "TXN-2026-0847", value: "₹24,50,000", status: "Active" },
      { label: "TXN-2026-0846", value: "₹8,75,000", status: "Settled" },
      { label: "TXN-2026-0845", value: "₹1,20,000", status: "Pending" },
      { label: "TXN-2026-0844", value: "₹45,00,000", status: "Settled" },
    ],
  },
  Milestones: {
    title: "Active Milestones",
    rows: [
      { label: "Design Phase", value: "100%", status: "Complete" },
      { label: "Development", value: "65%", status: "In Progress" },
      { label: "QA Testing", value: "0%", status: "Pending" },
      { label: "Final Delivery", value: "0%", status: "Pending" },
    ],
  },
  Wallet: {
    title: "Wallet Overview",
    rows: [
      { label: "Available Balance", value: "₹12,25,000" },
      { label: "Locked in Escrow", value: "₹24,50,000" },
      { label: "Pending Release", value: "₹8,75,000" },
      { label: "Total Volume", value: "₹45,50,000" },
    ],
  },
  Settlement: {
    title: "Settlement Queue",
    rows: [
      { label: "Vendor A — Acme Corp", value: "₹8,75,000", status: "Processing" },
      { label: "Vendor B — Tech Ltd", value: "₹3,50,000", status: "Queued" },
      { label: "Vendor C — Build Co", value: "₹12,00,000", status: "Complete" },
    ],
  },
  Analytics: {
    title: "Platform Analytics",
    rows: [
      { label: "Transaction Volume", value: "₹45.5 Cr" },
      { label: "Success Rate", value: "99.2%" },
      { label: "Avg. Settlement Time", value: "2.4 hrs" },
      { label: "Active Escrows", value: "847" },
    ],
  },
  KYC: {
    title: "KYC Status",
    rows: [
      { label: "Verified Parties", value: "1,247", status: "Verified" },
      { label: "Pending Review", value: "23", status: "Pending" },
      { label: "Compliance Score", value: "98.5%" },
    ],
  },
  "Vendor Management": {
    title: "Vendor Directory",
    rows: [
      { label: "Active Vendors", value: "156" },
      { label: "Pending Onboarding", value: "12" },
      { label: "Avg. Payout Time", value: "4.2 hrs" },
    ],
  },
  "API Logs": {
    title: "Recent API Activity",
    rows: [
      { label: "POST /escrow/create", value: "200 OK", status: "Success" },
      { label: "GET /escrow/0847", value: "200 OK", status: "Success" },
      { label: "POST /release/milestone", value: "200 OK", status: "Success" },
    ],
  },
};

const TAB_ICONS: Record<string, typeof Activity> = {
  Transactions: CreditCard,
  Milestones: CheckCircle2,
  Wallet: Wallet,
  Settlement: FileText,
  Analytics: BarChart3,
  KYC: Shield,
  "Vendor Management": Users,
  "API Logs": Code2,
};

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("Transactions");
  const content = TAB_CONTENT[activeTab];

  return (
    <section id="developers" className="section-padding">
      <div className="container-max">
        <FadeIn>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Platform
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              One dashboard. Complete control.
            </h2>
            <p className="mt-4 text-lg text-muted">
              Manage transactions, milestones, settlements, and APIs from a single enterprise dashboard.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="card-shadow overflow-hidden rounded-3xl border border-slate-100 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="ml-4 text-sm font-medium text-muted">EXCRO Platform — Dashboard</span>
            </div>

            <div className="flex flex-col lg:flex-row">
              <div className="border-b border-slate-100 p-4 lg:w-56 lg:border-b-0 lg:border-r">
                <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                  {PRODUCT_TABS.map((tab) => {
                    const Icon = TAB_ICONS[tab] || Activity;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                          activeTab === tab
                            ? "bg-primary text-white"
                            : "text-muted hover:bg-light-blue hover:text-primary"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="flex-1 p-6 md:p-8">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="mb-6 text-lg font-bold text-foreground">{content.title}</h3>
                  <div className="space-y-3">
                    {content.rows.map((row, i) => (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between rounded-xl border border-slate-100 px-5 py-4 transition-colors hover:bg-slate-50"
                      >
                        <span className="text-sm font-medium text-foreground">{row.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">{row.value}</span>
                          {row.status && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                row.status === "Active" || row.status === "In Progress" || row.status === "Processing"
                                  ? "bg-blue-50 text-primary"
                                  : row.status === "Settled" || row.status === "Complete" || row.status === "Success" || row.status === "Verified"
                                    ? "bg-green-50 text-success"
                                    : "bg-slate-100 text-muted"
                              }`}
                            >
                              {row.status}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
