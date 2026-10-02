import type { EconomicsConfig } from "./config";
import type { JobContext, ScheduleModifier } from "./scope";

/** Derive which internal schedule modifiers apply from the appointment context. */
export function detectScheduleModifiers(context: JobContext): ScheduleModifier[] {
  const out: ScheduleModifier[] = [];
  const hour = context.appointmentTime ? Number(context.appointmentTime.slice(0, 2)) : null;
  const minute = context.appointmentTime ? Number(context.appointmentTime.slice(3, 5)) : 0;
  const decimalHour = hour === null ? null : hour + minute / 60;
  const weekday = context.weekday;

  const isWeekend = weekday === 0 || weekday === 6;
  if (isWeekend) out.push("weekend");
  if (decimalHour !== null) {
    const weekdayRush = weekday !== undefined && !isWeekend && ((decimalHour >= 7 && decimalHour < 9.5) || (decimalHour >= 16 && decimalHour < 18.5));
    if (weekdayRush) out.push("rush_hour");
    if (decimalHour >= 20) out.push("late_evening");
  }
  if (context.sameDay) out.push("same_day");
  if (context.awkwardGap) out.push("awkward_gap");
  return out;
}

export interface AppliedScheduleModifier {
  key: ScheduleModifier;
  extraCostCents: number;
  extraDriveMinutes: number;
  /** Customer-visible surcharge. Zero unless the owner explicitly enabled customerFacing for this rule. */
  customerSurchargeCents: number;
}

export function applyScheduleModifiers(
  keys: ScheduleModifier[],
  laborCostCents: number,
  cfg: EconomicsConfig,
): { applied: AppliedScheduleModifier[]; extraCostCents: number; extraDriveMinutes: number; customerSurchargeCents: number } {
  const applied: AppliedScheduleModifier[] = [];
  let extraCostCents = 0;
  let extraDriveMinutes = 0;
  let customerSurchargeCents = 0;
  for (const key of keys) {
    const rule = cfg.scheduleModifiers[key];
    if (!rule || !rule.enabled) continue;
    const cost = Math.round(laborCostCents * rule.laborCostPct) + rule.extraCostCents;
    const surcharge = rule.customerFacing ? rule.customerSurchargeCents : 0;
    applied.push({ key, extraCostCents: cost, extraDriveMinutes: rule.extraDriveMinutes, customerSurchargeCents: surcharge });
    extraCostCents += cost;
    extraDriveMinutes += rule.extraDriveMinutes;
    customerSurchargeCents += surcharge;
  }
  return { applied, extraCostCents, extraDriveMinutes, customerSurchargeCents };
}
