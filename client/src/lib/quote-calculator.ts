import { pricingData } from "@/data/pricing-data";
import { getTravelContext, type TravelTier } from "@/lib/travel-pricing";

export type MountType = "fixed" | "tilting" | "fullMotion";
export type WallType = "drywall" | "brick" | "highrise";
export type CameraType = "wireless_smart" | "wired_smart" | "wired_dvr";
export type RackTeardownLevel = "none" | "small" | "medium" | "large";

export type MoveProjectConfig = {
  enabled: boolean;
  previousZipCode: string;
  oldHomeTvUnmountCount: number;
  oldHomeMountRemovalCount: number;
  rackTeardownLevel: RackTeardownLevel;
};

/** Explicit size answer for a 56"+ TV (Issue #35 review fix): the customer must say which range the TV is in, or that they are not sure. */
export type TvSizeChoice = "56-85" | "86+" | "unsure";

export type TVConfig = {
  id: string;
  size: "32-55" | "56+";
  wallType: WallType;
  location: "standard" | "fireplace";
  hasMount: boolean;
  mountType: MountType | null;
  wireConcealment: boolean;
  outletDistance: "near" | "far" | null;
  unmounting: boolean;
  /** Explicit 56"+ size-range answer. "86+" routes to custom-quote review; "unsure" routes to size-confirmation review. */
  sizeChoice?: TvSizeChoice | null;
  /** Exact diagonal in inches when the customer knows it. 86+ routes to custom-quote review (owner rule S-4). */
  exactInches?: number | null;
  /** Exact TV model, collected for oversize / compatibility review. */
  model?: string | null;
  /** TV weight in pounds when known (oversize review). */
  weightLbs?: number | null;
  /** VESA pattern (e.g. "600x400") when known (oversize review). */
  vesaPattern?: string | null;
};

/** Owner rule S-4: TVs at or above this diagonal are never instant-priced; they route to custom-quote review. 85" is NOT oversized. */
export const OVERSIZE_THRESHOLD_INCHES = 86;

export function isOversizeTv(tv: Pick<TVConfig, "exactInches" | "sizeChoice">): boolean {
  if (tv.sizeChoice === "86+") return true;
  return typeof tv.exactInches === "number" && Number.isFinite(tv.exactInches) && tv.exactInches >= OVERSIZE_THRESHOLD_INCHES;
}

export type TvSizeReview = { kind: "oversize" | "unknown" | "contradiction"; detail: string };

/**
 * Issue #35 review fix (size gate): decide whether a TV's size answer routes it
 * out of instant pricing. A stated exact size that contradicts the chosen band
 * or range is a contradiction — it is never silently dropped or priced. An
 * explicit "unsure" is unknown. An absent choice with absent inches keeps the
 * legacy behaviour for internal callers; the public form and the public API
 * both require the explicit choice before a firm price can be accepted.
 */
export function tvSizeReview(tv: Pick<TVConfig, "size" | "exactInches" | "sizeChoice">): TvSizeReview | null {
  const inches = typeof tv.exactInches === "number" && Number.isFinite(tv.exactInches) ? tv.exactInches : null;
  if (inches !== null) {
    if (tv.size === "32-55" && inches >= 56) {
      return { kind: "contradiction", detail: `the size range says 32–55" but the exact size is ${inches}"` };
    }
    if (tv.size === "56+" && inches < 56) {
      return { kind: "contradiction", detail: `the size range says 56"+ but the exact size is ${inches}"` };
    }
    if (tv.sizeChoice === "56-85" && inches >= OVERSIZE_THRESHOLD_INCHES) {
      return { kind: "contradiction", detail: `the size range says 56–85" but the exact size is ${inches}"` };
    }
    if (tv.sizeChoice === "86+" && inches < OVERSIZE_THRESHOLD_INCHES) {
      return { kind: "contradiction", detail: `the size range says 86"+ but the exact size is ${inches}"` };
    }
  }
  if (isOversizeTv(tv)) {
    return { kind: "oversize", detail: inches !== null ? `${inches}"` : "86 inches or larger" };
  }
  if (tv.sizeChoice === "unsure") {
    return { kind: "unknown", detail: "exact size not confirmed" };
  }
  return null;
}

export type CameraConfig = {
  id: string;
  brand: "ring" | "blink" | "google" | "arlo" | "wyze" | "other";
  type: CameraType;
  location: "indoor" | "outdoor";
};

export type QuoteFormState = {
  tvs: TVConfig[];
  cameras: CameraConfig[];
  doorbell: boolean;
  doorbellBrand: string;
  soundbar: boolean;
  surroundSound: boolean;
  floodlight: boolean;
  handymanMinutes: number;
  moveProject: MoveProjectConfig;
  zipCode: string;
  notes: string;
};

export type QuoteLineItem = {
  name: string;
  price: number;
  qty?: number;
  lineTotal: number;
  isDiscount?: boolean;
};

export type QuoteGroup = {
  title: string;
  subtitle?: string;
  items: QuoteLineItem[];
  subtotal: number;
};

export type QuoteResult = {
  groups: QuoteGroup[];
  subtotal: number;
  discount: number;
  total: number;
  flags: string[];
  followUp?: string;
  /** True when part of the job must be reviewed before a firm final price (oversize TVs, masonry fireplaces). */
  requiresReview?: boolean;
  /** Customer-safe reasons the review is required. */
  reviewReasons?: string[];
  travelTier: TravelTier;
  travelFee: number | "out_of_range";
  travelContext: ReturnType<typeof getTravelContext>;
};

const cameraBrandLabels: Record<CameraConfig["brand"], string> = {
  ring: "Ring",
  blink: "Blink",
  google: "Google Nest",
  arlo: "Arlo",
  wyze: "Wyze",
  other: "Other",
};

function getMountPrice(size: TVConfig["size"], mountType: MountType): number {
  const isLarge = size === "56+";

  if (mountType === "fixed") {
    return isLarge ? pricingData.tvMounts.fixedBig.price : pricingData.tvMounts.fixedSmall.price;
  }

  if (mountType === "tilting") {
    return isLarge ? pricingData.tvMounts.tiltingBig.price : pricingData.tvMounts.tiltingSmall.price;
  }

  return isLarge ? pricingData.tvMounts.fullMotionBig.price : pricingData.tvMounts.fullMotionSmall.price;
}

function getMountLabel(size: TVConfig["size"], mountType: MountType): string {
  const isLarge = size === "56+";

  if (mountType === "fixed") {
    return isLarge ? pricingData.tvMounts.fixedBig.name : pricingData.tvMounts.fixedSmall.name;
  }

  if (mountType === "tilting") {
    return isLarge ? pricingData.tvMounts.tiltingBig.name : pricingData.tvMounts.tiltingSmall.name;
  }

  return isLarge ? pricingData.tvMounts.fullMotionBig.name : pricingData.tvMounts.fullMotionSmall.name;
}

function getTvSubtitle(tv: TVConfig): string {
  const sizeLabel = typeof tv.exactInches === "number" && tv.exactInches > 0 ? `${tv.exactInches}" · ` : "";
  const locationLabel = tv.location === "fireplace" ? "Above fireplace" : "Standard wall";
  const wallLabel =
    tv.wallType === "brick"
      ? "Brick"
      : tv.wallType === "highrise"
        ? "High-rise / Steel Stud"
        : "Drywall";
  const mountLabel = tv.hasMount
    ? "Customer mount"
    : tv.mountType === "fullMotion"
      ? "Full Motion mount"
      : tv.mountType === "tilting"
        ? "Tilting mount"
        : "Fixed mount";

  return `${sizeLabel}${locationLabel}, ${wallLabel}, ${mountLabel}`;
}

export function createDefaultTVConfig(): TVConfig {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    size: "56+",
    wallType: "drywall",
    location: "standard",
    hasMount: true,
    mountType: null,
    wireConcealment: false,
    outletDistance: null,
    unmounting: false,
    sizeChoice: null,
    exactInches: null,
    model: "",
    weightLbs: null,
    vesaPattern: "",
  };
}

export function createDefaultCameraConfig(): CameraConfig {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `camera-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    brand: "ring",
    type: "wireless_smart",
    location: "outdoor",
  };
}

export function createDefaultMoveProjectConfig(): MoveProjectConfig {
  return {
    enabled: false,
    previousZipCode: "",
    oldHomeTvUnmountCount: 0,
    oldHomeMountRemovalCount: 0,
    rackTeardownLevel: "none",
  };
}

export function createDefaultQuoteFormState(): QuoteFormState {
  return {
    tvs: [createDefaultTVConfig()],
    cameras: [],
    doorbell: false,
    doorbellBrand: "Ring",
    soundbar: false,
    surroundSound: false,
    floodlight: false,
    handymanMinutes: 0,
    moveProject: createDefaultMoveProjectConfig(),
    zipCode: "",
    notes: "",
  };
}

export function getCameraSummary(cameras: CameraConfig[]): string {
  if (!cameras.length) {
    return "No cameras included";
  }

  return cameras
    .map((camera, index) => `${cameraBrandLabels[camera.brand]} ${index + 1} (${camera.type.replace(/_/g, " ")}, ${camera.location})`)
    .join("; ");
}

export function calculateTroubleshootingTotal(minutes: number): number {
  if (minutes <= 0) {
    return 0;
  }

  const basePrice = pricingData.otherServices.avTroubleshooting.minimum ?? pricingData.otherServices.avTroubleshooting.price;
  if (minutes <= 60) {
    return basePrice;
  }

  const additionalHalfHours = Math.ceil((minutes - 60) / 30);
  return basePrice + additionalHalfHours * (pricingData.otherServices.avTroubleshooting.halfHourRate ?? 0);
}

export function calculateQuote(state: QuoteFormState): QuoteResult {
  // Historical/test callers may supply a pre-move QuoteFormState at runtime.
  // Treat a missing moveProject as the disabled default instead of crashing.
  const moveProject = state.moveProject ?? createDefaultMoveProjectConfig();
  const groups: QuoteGroup[] = [];
  const flags = new Set<string>();
  const travelContext =
    state.zipCode.length === 5
      ? getTravelContext(state.zipCode)
      : {
          fee: 0,
          tier: 0 as TravelTier,
          dayType: "weekday" as const,
          origin: "Midtown Atlanta (Georgia Tech)",
          availabilityNote: null,
          feeLabel: "No travel fee",
          oneWayMiles: null,
          roundTripMiles: null,
        };
  const travelFee = travelContext.fee;
  const travelTier = travelContext.tier;

  let positiveSubtotal = 0;
  let pricedWireJobs = 0;
  let additionalTvDiscountUnits = 0;
  const reviewReasons: string[] = [];

  state.tvs.forEach((tv, index) => {
    const items: QuoteLineItem[] = [];
    const isAdditionalTv = index > 0;
    const sizeReview = tvSizeReview(tv);
    const masonryFireplace = tv.location === "fireplace" && tv.wallType === "brick";

    if (sizeReview) {
      // Owner rule S-4 + Issue #35 size gate: a TV whose size is oversize,
      // unconfirmed, or self-contradictory is never instant-priced (no $100
      // fallback, and a contradictory size is never silently dropped). Mount
      // and wire work for this TV are part of the review, so they are not
      // priced here either; unmounting an existing TV below stays standard work.
      if (sizeReview.kind === "oversize") {
        const label = typeof tv.exactInches === "number" ? `${tv.exactInches}"` : "86\"+";
        items.push({
          name: `Oversized TV (${label}) — custom quote, review required`,
          price: 0,
          qty: 1,
          lineTotal: 0,
        });
        reviewReasons.push(
          `TV ${index + 1} (${label}): TVs 86 inches and larger are custom-quoted after we confirm the exact model, weight, VESA pattern, mount/load compatibility, access, and whether a helper is needed.`,
        );
        flags.add(
          `TV ${index + 1} is ${label}. TVs 86"+ never get an instant price — we'll review the model, weight, VESA pattern, and mount compatibility and send a custom quote. Any mount or wire work for this TV is confirmed in that review.`,
        );
      } else if (sizeReview.kind === "unknown") {
        items.push({
          name: "TV size to confirm — custom quote if it is 86 inches or larger",
          price: 0,
          qty: 1,
          lineTotal: 0,
        });
        reviewReasons.push(
          `TV ${index + 1}: the exact size is not confirmed yet. TVs 86 inches and larger are custom-quoted, so we'll confirm the size before a final price.`,
        );
        flags.add(
          `TV ${index + 1}: exact size not confirmed. If it is 86 inches or larger it will be custom-quoted after a compatibility review.`,
        );
      } else {
        items.push({
          name: "TV size details conflict — custom quote after we confirm the exact size",
          price: 0,
          qty: 1,
          lineTotal: 0,
        });
        reviewReasons.push(
          `TV ${index + 1}: the size details conflict (${sizeReview.detail}). We'll confirm the exact size before pricing this TV.`,
        );
        flags.add(
          `TV ${index + 1}: size details conflict (${sizeReview.detail}) — we'll confirm the exact size before pricing.`,
        );
      }
    } else {
      const baseMountPrice =
        tv.location === "fireplace"
          ? pricingData.tvMounting.fireplace.price
          : pricingData.tvMounting.standard.price;

      items.push({
        name:
          tv.location === "fireplace"
            ? pricingData.tvMounting.fireplace.name
            : pricingData.tvMounting.standard.name,
        price: baseMountPrice,
        qty: 1,
        lineTotal: baseMountPrice,
      });
      positiveSubtotal += baseMountPrice;

      if (tv.wallType === "brick" && tv.location !== "fireplace") {
        items.push({
          name: pricingData.tvMounting.nonDrywall.name,
          price: pricingData.tvMounting.nonDrywall.price,
          qty: 1,
          lineTotal: pricingData.tvMounting.nonDrywall.price,
        });
        positiveSubtotal += pricingData.tvMounting.nonDrywall.price;
      }

      if (tv.wallType === "highrise") {
        items.push({
          name: pricingData.tvMounting.highRise.name,
          price: pricingData.tvMounting.highRise.price,
          qty: 1,
          lineTotal: pricingData.tvMounting.highRise.price,
        });
        positiveSubtotal += pricingData.tvMounting.highRise.price;
      }

      if (!tv.hasMount && tv.mountType) {
        const mountPrice = getMountPrice(tv.size, tv.mountType);
        items.push({
          name: getMountLabel(tv.size, tv.mountType),
          price: mountPrice,
          qty: 1,
          lineTotal: mountPrice,
        });
        positiveSubtotal += mountPrice;
      }

      if (tv.wireConcealment) {
        if (tv.location === "fireplace") {
          items.push({
            name: "Wire concealment assessment required",
            price: 0,
            qty: 1,
            lineTotal: 0,
          });
          flags.add("Wire concealment above fireplaces requires photos before we can confirm pricing.");
          // Issue #35 flag propagation: an unpriced assessment line means the
          // total is knowingly partial, so the quote must carry review state
          // end-to-end (results, booking block, inquiry payload), not just a flag.
          reviewReasons.push(
            `TV ${index + 1}: wire concealment above a fireplace is priced after a photo assessment, so that part of the job is confirmed during review.`,
          );
        } else {
          pricedWireJobs += 1;
          items.push({
            name: pricingData.wireConcealment.standard.name,
            price: pricingData.wireConcealment.standard.price,
            qty: 1,
            lineTotal: pricingData.wireConcealment.standard.price,
          });
          positiveSubtotal += pricingData.wireConcealment.standard.price;
          if (tv.outletDistance === "far") {
            flags.add(`TV ${index + 1} wire concealment may need extra outlet work because the nearest outlet is more than 1–2 feet from the TV location. We'll confirm final pricing before work begins.`);
          } else if (tv.outletDistance === null) {
            flags.add(`TV ${index + 1} wire concealment pricing assumes the nearest outlet is within 1–2 feet of the TV location. If not, we may need to confirm extra work.`);
          }
        }
      }

      if (masonryFireplace) {
        // Owner rule S-2: brick/stone fireplaces START at the $200 fireplace price —
        // no universal surcharge — but the total is a starting price, not a firm
        // quote, until a photo review confirms the surface difficulty.
        reviewReasons.push(
          `TV ${index + 1}: brick/stone fireplace mounting starts at $200. The final price is confirmed after a quick photo review of the fireplace surface.`,
        );
        flags.add(
          `TV ${index + 1}: brick/stone fireplace mounting starts at $200. Please have photos of the fireplace and wall ready — we'll confirm the final price after a quick photo review before booking.`,
        );
      }
    }

    if (tv.unmounting) {
      items.push({
        name: pricingData.tvMounting.unmount.name,
        price: pricingData.tvMounting.unmount.price,
        qty: 1,
        lineTotal: pricingData.tvMounting.unmount.price,
      });
      positiveSubtotal += pricingData.tvMounting.unmount.price;
    }

    if (isAdditionalTv) {
      additionalTvDiscountUnits += 1;
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    groups.push({
      title: `TV ${index + 1}`,
      subtitle: getTvSubtitle(tv),
      items,
      subtotal,
    });
  });

  const sharedItems: QuoteLineItem[] = [];

  if (state.cameras.length > 0) {
    const brandSummary = Array.from(new Set(state.cameras.map((camera) => cameraBrandLabels[camera.brand]))).join(", ");
    sharedItems.push({
      name: `${brandSummary || "Security camera"} installation — custom quote`,
      price: 0,
      qty: state.cameras.length,
      lineTotal: 0,
    });
    flags.add("Security-camera work is reviewed by device, wiring, location, and scope before a final price is confirmed.");
  }

  if (state.doorbell) {
    const label = state.doorbellBrand ? `${state.doorbellBrand} doorbell installation` : "Smart doorbell installation";
    sharedItems.push({
      name: `${label} — custom quote`,
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.add("Smart-home device work is custom-priced after the exact device and installation conditions are reviewed.");
  }

  if (state.soundbar) {
    sharedItems.push({
      name: "Soundbar mounting / setup — custom quote",
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.add("Soundbar work is custom-priced after placement, wall type, and cable/device scope are confirmed.");
  }

  if (state.surroundSound) {
    sharedItems.push({
      name: "Surround-sound request — scope review required",
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.add("Full home-theater wiring is not a standard PPTVInstall service. We can review the exact scope and confirm whether we can help.");
  }

  if (state.floodlight) {
    sharedItems.push({
      name: "Smart floodlight installation — custom quote",
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.add("Smart floodlight work requires review of the exact device and existing outdoor wiring before price is confirmed.");
  }

  if (state.handymanMinutes > 0) {
    sharedItems.push({
      name: "Specialty AV / mounting add-on — custom quote",
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.add("PPTVInstall is not a general handyman service. Specialty AV, projector, outdoor-TV, or unusual mounting requests are reviewed individually.");
  }

  if (travelTier === "out_of_range") {
    flags.add("This ZIP is not in our quick route lookup. We may still serve it; distance and route fit will be reviewed before final booking.");
  }

  if (state.tvs.length >= 5) {
    flags.add("Large multi-room projects may qualify for a custom bundle rate. We'll discuss that at booking.");
  }

  if (sharedItems.length > 0) {
    groups.push({
      title: "Shared Services",
      items: sharedItems,
      subtotal: sharedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    });
  }

  let moveSubtotal = 0;
  if (moveProject.enabled) {
    const moveItems: QuoteLineItem[] = [];
    const move = moveProject;

    if (move.oldHomeTvUnmountCount > 0) {
      const lineTotal = pricingData.tvMounting.unmount.price * move.oldHomeTvUnmountCount;
      moveItems.push({ name: "Previous-home TV unmounting", price: pricingData.tvMounting.unmount.price, qty: move.oldHomeTvUnmountCount, lineTotal });
      moveSubtotal += lineTotal;
    }

    if (move.oldHomeMountRemovalCount > 0) {
      const lineTotal = pricingData.moveProject.mountRemovalOnly.price * move.oldHomeMountRemovalCount;
      moveItems.push({ name: pricingData.moveProject.mountRemovalOnly.name, price: pricingData.moveProject.mountRemovalOnly.price, qty: move.oldHomeMountRemovalCount, lineTotal });
      moveSubtotal += lineTotal;
    }

    if (move.rackTeardownLevel !== "none") {
      const rack = pricingData.moveProject.rackTeardown[move.rackTeardownLevel];
      moveItems.push({ name: `${rack.name} (~${rack.minutes / 60} hr)`, price: rack.price, qty: 1, lineTotal: rack.price });
      moveSubtotal += rack.price;
    }

    const hasPreviousHomeWork = move.oldHomeTvUnmountCount > 0 || move.oldHomeMountRemovalCount > 0 || move.rackTeardownLevel !== "none";
    if (hasPreviousHomeWork) {
      moveItems.push({ name: pricingData.moveProject.secondSiteCoordination.name, price: pricingData.moveProject.secondSiteCoordination.price, qty: 1, lineTotal: pricingData.moveProject.secondSiteCoordination.price });
      moveSubtotal += pricingData.moveProject.secondSiteCoordination.price;
      positiveSubtotal += moveSubtotal;
      groups.push({
        title: "Previous Home / Move",
        subtitle: move.previousZipCode ? `Previous home ZIP ${move.previousZipCode} · new home ZIP ${state.zipCode || "to confirm"}` : "Two-location project",
        items: moveItems,
        subtotal: moveSubtotal,
      });
      flags.add("Two-location pricing assumes ordinary access, no major wall repair, and no haul-away unless listed.");
      if (!/^\d{5}$/.test(move.previousZipCode)) flags.add("Previous-home ZIP is not entered yet; route between homes will be confirmed before booking.");
    }
  }

  const qualifiesMoveBundle =
    moveProject.enabled &&
    state.tvs.length >= pricingData.moveProject.bundleDiscount.minimumNewTvInstalls &&
    moveSubtotal > 0;
  const bundleDiscount = qualifiesMoveBundle ? pricingData.moveProject.bundleDiscount.amount : 0;
  if (bundleDiscount > 0) flags.add("Two-home project bundle savings are already included in this estimate.");

  return {
    groups,
    subtotal: positiveSubtotal,
    discount: bundleDiscount,
    total: Math.max(0, positiveSubtotal - bundleDiscount),
    flags: Array.from(flags),
    requiresReview: reviewReasons.length > 0,
    reviewReasons,
    travelTier,
    travelFee,
    travelContext,
  };
}
