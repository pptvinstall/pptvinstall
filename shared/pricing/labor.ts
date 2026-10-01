import type { EconomicsConfig } from "./config";
import type { JobScope } from "./scope";
import { safeCents, type Cents } from "./money";

export interface LaborTask {
  key: string;
  label: string;
  minutes: number;
}

export interface LaborBreakdown {
  tasks: LaborTask[];
  /** Owner on-site minutes after complexity multiplier. */
  minutes: number;
  helperMinutes: number;
  /** Owner time valued at the configured target rate. */
  ownerCostCents: Cents;
  helperCostCents: Cents;
  totalCostCents: Cents;
}

export function computeLabor(scope: JobScope, cfg: EconomicsConfig): LaborBreakdown {
  const L = cfg.labor;
  const tasks: LaborTask[] = [];
  const add = (key: string, label: string, minutes: number) => {
    if (minutes > 0) tasks.push({ key, label, minutes });
  };

  if (scope.tvs.length || scope.extras.length) add("setup", "Setup, walk-through, sign-off", L.setupMinutes);

  scope.tvs.forEach((tv, index) => {
    const n = index + 1;
    const efficiency = index === 0 ? 1 : L.additionalTvEfficiency;
    const base = (L.perTvBaseMinutes[tv.sizeBand] ?? 0) * efficiency;
    add(`tv${n}.base`, `TV ${n}: mount (${tv.sizeBand})`, Math.round(base));
    add(`tv${n}.wall`, `TV ${n}: ${tv.wall} wall`, L.wallMinutes[tv.wall] ?? 0);
    add(`tv${n}.location`, `TV ${n}: ${tv.location.replace("_", " ")} location`, L.locationMinutes[tv.location] ?? 0);
    if (tv.mountSource === "pptv") {
      add(`tv${n}.mount`, `TV ${n}: assemble PPTV mount`, L.mountSuppliedMinutes);
      if (tv.mountType) add(`tv${n}.mountType`, `TV ${n}: ${tv.mountType.replace("_", " ")} adjustment`, L.mountTypeMinutes[tv.mountType] ?? 0);
    }
    add(`tv${n}.wire`, `TV ${n}: ${tv.wire.replace("_", " ")} wiring`, L.wireMinutes[tv.wire] ?? 0);
    if (tv.power === "outlet") add(`tv${n}.outlet`, `TV ${n}: install outlet / clean-cord`, L.outletInstallMinutes);
    if (tv.power === "unknown") add(`tv${n}.powerUnknown`, `TV ${n}: power not verified (allowance)`, L.powerUnknownMinutes);
    if (tv.removal.tvRemoval) add(`tv${n}.tvRemoval`, `TV ${n}: remove TV`, L.removalMinutes.tvRemoval);
    if (tv.removal.mountRemoval) add(`tv${n}.mountRemoval`, `TV ${n}: remove mount`, L.removalMinutes.mountRemoval);
    if (tv.removal.remount) add(`tv${n}.remount`, `TV ${n}: remount / relocate`, L.removalMinutes.remount);
  });

  scope.extras.forEach((extra, i) => {
    const per = extra.kind === "custom" ? extra.customMinutes ?? 0 : L.extraMinutes[extra.kind] ?? 0;
    add(`extra${i + 1}.${extra.kind}`, `${extra.label ?? extra.kind} x${extra.qty}`, per * extra.qty);
  });

  if (scope.access.furnitureMovement) add("access.furniture", "Furniture movement", L.access.furnitureMovementMinutes);
  if (scope.access.ladderHeight) add("access.ladder", "Ladder / height work", L.access.ladderHeightMinutes);
  if (scope.tvs.length || scope.extras.length) add("cleanup", `Cleanup: ${scope.cleanup.replace("_", " ")}`, L.cleanupMinutes[scope.cleanup] ?? 0);

  let minutes = tasks.reduce((s, t) => s + t.minutes, 0);
  if (scope.access.level === "difficult") {
    const extra = Math.round(minutes * (L.access.difficultMultiplier - 1));
    add("access.difficult", "Difficult access multiplier", extra);
    minutes += extra;
  }

  const helperMinutes = scope.access.helper ? Math.round(minutes * L.access.helperShare) : 0;
  const ownerCostCents = safeCents((minutes / 60) * L.targetLaborPerHourCents);
  const helperCostCents = safeCents((helperMinutes / 60) * L.helperPerHourCents);
  return { tasks, minutes, helperMinutes, ownerCostCents, helperCostCents, totalCostCents: ownerCostCents + helperCostCents };
}
