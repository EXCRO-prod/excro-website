"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  Code2,
  Lock,
  TrendingUp,
  Wallet,
} from "lucide-react";

export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="card-shadow relative overflow-hidden rounded-2xl border border-slate-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-muted">Escrow Dashboard</p>
            <p className="text-sm font-semibold text-foreground">TXN-2026-0847</p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-success">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="rounded-xl bg-light-blue p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted">Money Locked</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹24,50,000</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted">Released</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹12,25,000</p>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted">Escrow Progress</span>
            <span className="font-semibold text-primary">50%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "50%" }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </div>

        <div className="space-y-2 px-5 pb-5">
          {[
            { label: "Milestone 1 — Design Complete", status: "Released", done: true },
            { label: "Milestone 2 — Development", status: "In Progress", done: false },
            { label: "Milestone 3 — Final Delivery", status: "Pending", done: false },
          ].map((milestone, i) => (
            <motion.div
              key={milestone.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${milestone.done ? "text-success" : "text-slate-300"}`}
                />
                <span className="text-xs font-medium text-foreground">{milestone.label}</span>
              </div>
              <span
                className={`text-[10px] font-semibold ${
                  milestone.done ? "text-success" : "text-muted"
                }`}
              >
                {milestone.status}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="card-shadow absolute -right-4 top-12 rounded-xl border border-slate-100 bg-white p-3 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted">API Status</p>
            <p className="text-xs font-semibold text-success">200 OK</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="card-shadow absolute -left-4 bottom-16 rounded-xl border border-slate-100 bg-white p-3 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted">Vendor Settlement</p>
            <p className="text-xs font-semibold text-foreground">₹8,75,000</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="card-shadow absolute -right-2 bottom-8 rounded-xl border border-slate-100 bg-white p-3 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted">Transaction</p>
            <p className="text-xs font-semibold text-foreground">Settled ✓</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
