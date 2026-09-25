// Step 0 of every deal (spec 13): who the parties are, their roles, deposit shares and the commission plan.
// Validated by building a provisional schedule and running the SAME structural rules that gate signing,
// so setup can never accept a party/commission shape that signing would later reject.
import { defaultTerms } from "./params.js";
import { scheduleSchema, validateSchedule, type CommissionPlan, type Role, type ScheduleIssue } from "./schedule.js";

export interface SetupParty {
  id: string;
  role: Role;
  label: string;
  depositShareBps: number;
  feeRule: { bps: number; fixedMinor: bigint };
}

/** Things that only make sense once a real deal (value, terms) exists; not setup problems. */
const NOT_SETUP_ISSUES = new Set(["deal_value", "units_times_price", "unset_required"]);

export function validateSetup(parties: SetupParty[], commission: CommissionPlan): ScheduleIssue[] {
  const payee = parties.find((p) => p.role === "payee") ?? parties[0];
  const parsed = scheduleSchema.safeParse({
    schema: "excro.release-schedule/1",
    version: 1,
    deal: { id: "setup", type: "goods_sale_inspection", currency: "INR", valueMinor: 1n, unitCount: 1, unitPriceMinor: 1n },
    participants: parties.map((p) => ({ id: p.id, role: p.role, label: p.label, signs: p.role !== "observer", depositShareBps: p.depositShareBps, feeRule: p.feeRule })),
    commission,
    terms: defaultTerms(),
    extraCharges: [],
    roundingBeneficiary: payee?.id ?? "",
  });
  if (!parsed.success) return [{ code: "invalid_shape", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }];
  return validateSchedule(parsed.data).filter((i) => !NOT_SETUP_ISSUES.has(i.code));
}
