import { DEFAULT_ECONOMICS_CONFIG, parseJobScope, type EconomicsConfig, type JobScope, type TvScope } from "../../shared/pricing";

export function cfg(overrides: (c: EconomicsConfig) => void = () => {}): EconomicsConfig {
  const copy = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG)) as EconomicsConfig;
  overrides(copy);
  return copy;
}

export function tv(over: Partial<TvScope> = {}): Partial<TvScope> {
  return { id: "tv-1", sizeBand: "56+", wall: "drywall", location: "standard", mountSource: "customer", wire: "visible", power: "existing", ...over };
}

export function scope(tvs: Array<Partial<TvScope>> = [tv()], extra: Partial<JobScope> = {}): JobScope {
  return parseJobScope({ tvs: tvs.map((t, i) => ({ ...t, id: t.id ?? `tv-${i + 1}` })), ...extra });
}

export const nearby = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
