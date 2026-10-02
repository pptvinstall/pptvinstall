import { getZipReferenceRoute } from "../../client/src/lib/travel-pricing";
import type { RouteProvider } from "./travel";
import type { JobContext, JobContextInput } from "./scope";

// Route resolution with safe fallbacks. A quote must never depend on an unreliable external call:
//   1. owner-entered miles/minutes win;
//   2. a live provider (none is configured today: no maps credentials exist) is tried with a short timeout;
//   3. the site's ZIP tier table (cached reference data, clearly labelled with its revision);
//   4. otherwise the engine's own "unknown route" assumption, which is flagged and makes the price an estimate.
// The engine itself stays pure: it only consumes the resolved numbers plus their source and timestamp.

/** Revision label for the ZIP tier table in client/src/lib/travel-pricing.ts. Update when the table changes. */
export const ZIP_REFERENCE_TABLE = { provider: "ZIP tier table", asOf: "site table rev. 2025-07" } as const;
/** Drive minutes per mile assumed for reference-table routes (about 30 mph average metro speed). */
export const REFERENCE_MINUTES_PER_MILE = 2;

export function referenceRouteForZip(zip: string | undefined, weekday?: number): { oneWayMiles: number; oneWayDriveMinutes: number } | null {
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  const dayType = weekday === 0 || weekday === 6 ? "weekend" : "weekday";
  const ref = getZipReferenceRoute(zip, dayType);
  if (!ref) return null;
  return { oneWayMiles: ref.oneWayMiles, oneWayDriveMinutes: Math.round(ref.oneWayMiles * REFERENCE_MINUTES_PER_MILE) };
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), ms)))]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fill in route facts for a context that has none. Never throws, never blocks longer than timeoutMs per provider.
 * `now` is injected so tests (and the engine's determinism) never depend on the clock.
 */
export async function resolveRouteContext(
  input: JobContextInput | JobContext,
  opts: { providers?: RouteProvider[]; timeoutMs?: number; now?: () => Date } = {},
): Promise<JobContextInput> {
  const ctx = { ...(input as JobContextInput) };
  if (ctx.oneWayMiles !== undefined || ctx.oneWayDriveMinutes !== undefined) return ctx;
  for (const provider of opts.providers ?? []) {
    const route = await withTimeout(provider.getRoute({ zip: ctx.zip, origin: ctx.origin }), opts.timeoutMs ?? 1_500);
    if (route && Number.isFinite(route.oneWayMiles) && Number.isFinite(route.oneWayMinutes) && route.oneWayMiles >= 0 && route.oneWayMinutes >= 0) {
      return {
        ...ctx,
        oneWayMiles: Math.min(500, route.oneWayMiles),
        oneWayDriveMinutes: Math.min(600, route.oneWayMinutes),
        routeSource: "provider",
        routeProvider: provider.name.slice(0, 40),
        routeAsOf: (opts.now?.() ?? new Date()).toISOString(),
      };
    }
  }
  const ref = referenceRouteForZip(ctx.zip, ctx.weekday);
  if (ref) return { ...ctx, ...ref, routeSource: "reference_table", routeProvider: ZIP_REFERENCE_TABLE.provider, routeAsOf: ZIP_REFERENCE_TABLE.asOf };
  return ctx;
}
