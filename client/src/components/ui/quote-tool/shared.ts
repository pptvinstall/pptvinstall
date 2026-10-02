import { formatPrice, pricingData } from "@/data/pricing-data";
import {
  createDefaultCameraConfig,
  createDefaultTVConfig,
  type CameraConfig,
  type MountType,
  type QuoteFormState,
  type QuoteGroup,
  type QuoteLineItem,
  type QuoteResult,
  type TVConfig,
  type WallType,
} from "@/lib/quote-calculator";
import { getTravelContext } from "@/lib/travel-pricing";

export type QuoteMode = "form" | "text" | "voice";

export type DisplayQuote = QuoteResult & {
  summary: string;
  followUp?: string;
};

export type QuoteRequestPayload = {
  name: string;
  phone: string;
  email: string;
};

export type AiQuoteConfig = {
  siteKey: string;
  enabled: boolean;
  turnstileRequired: boolean;
  requireTurnstile?: boolean;
};

export type NextStepIntent = "schedule" | "send_quote" | "text_confirm" | null;
export type QuoteSourceMode = QuoteMode | null;
export type OutletDistanceAnswer = "yes" | "no" | "not_sure" | null;

export type PendingQuoteStorage = {
  total: number;
  summary: string;
  groups: QuoteGroup[];
  flags: string[];
  followUp?: string;
  promoCode?: string;
};

export type StandaloneServices = {
  removalCount: number;
  troubleshootingMinutes: number;
  wireManagementLocations: number;
  deviceSetup: boolean;
  sharedUnmountCount: number;
};

export type FullAiQuoteResponse = {
  groups?: Array<{
    title?: string;
    subtitle?: string;
    items?: Array<{
      name?: string;
      price?: number;
      qty?: number;
      lineTotal?: number;
      isDiscount?: boolean;
    }>;
    subtotal?: number;
  }>;
  subtotal?: number;
  discount?: number;
  total?: number;
  summary?: string;
  flags?: string[];
  followUp?: string;
};

export const tvAccentClasses = [
  "border-l-blue-500",
  "border-l-violet-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-rose-500",
];

export const mountTypeLabels: Record<MountType, string> = {
  fixed: "Fixed",
  tilting: "Tilting",
  fullMotion: "Full Motion",
};

export const wallTypeLabels: Record<WallType, string> = {
  drywall: "Drywall",
  brick: "Brick or Stone (+$50)",
  highrise: "High-rise / Steel Stud (+$25)",
};

export const pendingQuoteStorageKey = "pptvinstall_pending_quote";
export const DESCRIBE_IT_MAX_CHARS = 400;
export const OUTLET_DISTANCE_QUESTION = "Is the existing outlet within 1–2 feet of where you want the TV mounted?";

export function createDefaultStandaloneServices(): StandaloneServices {
  return {
    removalCount: 0,
    troubleshootingMinutes: 0,
    wireManagementLocations: 0,
    deviceSetup: false,
    sharedUnmountCount: 0,
  };
}

export function extractJson<T>(content: string): T {
  const trimmed = content.trim();
  const withoutFences = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude did not return valid JSON.");
  }

  return JSON.parse(withoutFences.slice(start, end + 1)) as T;
}

export function isValidFiveDigitZip(value: string): boolean {
  return /^\d{5}$/.test(value);
}

export function extractZipFromDescription(value: string): string {
  const match = value.match(/\b\d{5}\b/);
  return match?.[0] ?? "";
}

export function cleanDescribeText(value: string): string {
  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const dedupedLines = lines.filter((line, index) => index === 0 || line.toLowerCase() !== lines[index - 1]?.toLowerCase());
  return dedupedLines.join("\n").replace(/[ ]{2,}/g, " ").trim();
}

function getTravelFeeAmount(travelFee: number | "out_of_range"): number {
  return typeof travelFee === "number" ? travelFee : 0;
}

function hasTravelFeeLine(groups: QuoteGroup[]): boolean {
  return groups.some((group) => group.items.some((item) => item.name.toLowerCase().startsWith("travel fee")));
}

export function normalizeQuoteForDisplayTotals<T extends DisplayQuote>(quote: T): T {
  const travelFeeAmount = getTravelFeeAmount(quote.travelFee);
  const subtotalExcludingTravel = Math.max(0, quote.subtotal - (hasTravelFeeLine(quote.groups) ? travelFeeAmount : 0));
  const totalIncludingTravel = Math.max(0, subtotalExcludingTravel - quote.discount + travelFeeAmount);

  return {
    ...quote,
    subtotal: subtotalExcludingTravel,
    total: totalIncludingTravel,
  };
}

function isAssessmentOnlyWireConcealment(item: QuoteLineItem): boolean {
  return item.name.trim().toLowerCase() === "wire concealment assessment required";
}

function shouldPriceStandardConcealment(group: QuoteGroup): boolean {
  const contextText = [group.title, group.subtitle, ...group.items.map((item) => item.name)].join(" ").toLowerCase();
  const hasFireplaceSignal = contextText.includes("fireplace");
  const hasMasonrySignal = /\b(brick|stone|masonry|concrete)\b/.test(contextText);

  return !hasFireplaceSignal && !hasMasonrySignal;
}

function correctAiWireConcealment(groups: QuoteGroup[]): QuoteGroup[] {
  return groups.map((group) => {
    let changed = false;

    const items = group.items.map((item) => {
      if (!isAssessmentOnlyWireConcealment(item) || !shouldPriceStandardConcealment(group)) {
        return item;
      }

      changed = true;
      return {
        name: pricingData.wireConcealment.standard.name,
        price: pricingData.wireConcealment.standard.price,
        qty: 1,
        lineTotal: pricingData.wireConcealment.standard.price,
      };
    });

    if (!changed) {
      return group;
    }

    return {
      ...group,
      items,
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  });
}

function correctAiFireplacePricing(groups: QuoteGroup[]): QuoteGroup[] {
  return groups.map((group) => {
    const contextText = [group.title, group.subtitle, ...group.items.map((item) => item.name)].join(" ").toLowerCase();
    const hasFireplaceSignal = contextText.includes("fireplace");

    if (!hasFireplaceSignal) {
      return group;
    }

    const fireplaceItem = group.items.find((item) => item.name === pricingData.tvMounting.fireplace.name);
    if (!fireplaceItem) {
      return group;
    }

    const standardMountItem = group.items.find((item) => item.name === pricingData.tvMounting.standard.name);
    const nonDrywallItem = group.items.find((item) => item.name === pricingData.tvMounting.nonDrywall.name);
    const hasCustomerMountContext = group.subtitle?.toLowerCase().includes("customer mount") ?? false;

    if (!standardMountItem && !nonDrywallItem) {
      return group;
    }

    const filteredItems = group.items.filter(
      (item) => item !== standardMountItem && item !== nonDrywallItem && item !== fireplaceItem,
    );

    const fireplaceDisplayName = hasCustomerMountContext
      ? "Fireplace TV Mounting (Customer's Mount)"
      : "Fireplace TV Mounting";

    const normalizedFireplaceItem: QuoteLineItem = {
      name: fireplaceDisplayName,
      price: fireplaceItem.lineTotal,
      qty: 1,
      lineTotal: fireplaceItem.lineTotal,
    };

    const items = [normalizedFireplaceItem, ...filteredItems];

    return {
      ...group,
      items,
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  });
}

function normalizeDiscountPresentation(groups: QuoteGroup[]) {
  const groupsWithoutDiscountLines = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.lineTotal >= 0),
  }));

  const tvGroupCount = groupsWithoutDiscountLines.filter((group) => group.title.startsWith("TV ")).length;
  const pricedWireJobs = groupsWithoutDiscountLines.reduce(
    (count, group) =>
      count +
      group.items.filter((item) => item.name === pricingData.wireConcealment.standard.name && item.lineTotal > 0).length,
    0,
  );

  const bundleDiscount =
    tvGroupCount > 1
      ? (Math.max(0, tvGroupCount - 1) * pricingData.discounts.multipleTvs.amount) +
        (Math.max(0, pricedWireJobs - 1) * pricingData.discounts.multipleOutlets.amount)
      : 0;

  return {
    groups: groupsWithoutDiscountLines.map((group) => ({
      ...group,
      subtotal: group.items.filter((item) => item.lineTotal >= 0).reduce((sum, item) => sum + item.lineTotal, 0),
    })),
    // Discounts are never automatic; owner-approved promotions are handled separately.
    discount: bundleDiscount,
  };
}

export function buildDisplayGroup(group: QuoteGroup): QuoteGroup {
  const hasFireplaceContext = [group.title, group.subtitle].some((value) => value?.toLowerCase().includes("fireplace"));
  const hasCustomerMountContext = group.subtitle?.toLowerCase().includes("customer mount") ?? false;

  if (!hasFireplaceContext) {
    return {
      ...group,
      items: group.items.map((item) => {
        if (item.lineTotal < 0 && item.name === pricingData.discounts.multipleTvs.name) {
          return {
            ...item,
            name: "Additional TV Discount",
          };
        }

        return item;
      }),
    };
  }

  const baseMountItem = group.items.find((item) => {
    const name = item.name.toLowerCase();
    return name.includes("fireplace") || name.includes("standard tv mounting");
  });
  const nonDrywallItem = group.items.find((item) => item.name === pricingData.tvMounting.nonDrywall.name);
  const canCombineFireplaceMount = Boolean(baseMountItem && nonDrywallItem);

  const displayItems: QuoteLineItem[] = [];

  if (canCombineFireplaceMount && baseMountItem && nonDrywallItem) {
    displayItems.push({
      name: hasCustomerMountContext ? "Fireplace TV Mounting (Customer's Mount)" : "Fireplace TV Mounting",
      price: baseMountItem.lineTotal + nonDrywallItem.lineTotal,
      qty: 1,
      lineTotal: baseMountItem.lineTotal + nonDrywallItem.lineTotal,
    });
  }

  for (const item of group.items) {
    if (canCombineFireplaceMount && (item === baseMountItem || item === nonDrywallItem)) {
      continue;
    }

    if (item.lineTotal < 0 && item.name === pricingData.discounts.multipleTvs.name) {
      displayItems.push({
        ...item,
        name: "Additional TV Discount",
      });
      continue;
    }

    displayItems.push(item);
  }

  return {
    ...group,
    items: displayItems,
  };
}

export function buildDisplayFlags(flags: string[]): string[] {
  const fireplaceAssessmentFlags = flags.filter((flag) => {
    const normalized = flag.toLowerCase();
    return normalized.includes("fireplace") && (normalized.includes("photo") || normalized.includes("confirm pricing"));
  });

  const otherFlags = flags.filter((flag) => !fireplaceAssessmentFlags.includes(flag));
  const dedupedOtherFlags = Array.from(new Set(otherFlags));

  if (fireplaceAssessmentFlags.length === 0) {
    return dedupedOtherFlags;
  }

  return [
    ...dedupedOtherFlags,
    "Fireplace wire concealment requires photo review before we confirm final pricing.",
  ];
}

export function groupContextText(group: QuoteGroup): string {
  return [group.title, group.subtitle, ...group.items.map((item) => item.name)].filter(Boolean).join(" ").toLowerCase();
}

function groupHasNonFireplaceWireConcealment(group: QuoteGroup): boolean {
  const contextText = groupContextText(group);
  return contextText.includes(pricingData.wireConcealment.standard.name.toLowerCase()) && !contextText.includes("fireplace");
}

function descriptionProvidesOutletDistanceInfo(description: string): boolean {
  const normalized = description.toLowerCase();
  return [
    /\bwithin\s+1(?:-|–|—|\s+to\s+)?2\s+feet\b/,
    /\b1(?:-|–|—|\s+to\s+)?2\s+feet\b/,
    /\boutlet\b.*\b(close|near|nearby|right below|directly below|behind it|behind the tv)\b/,
    /\b(close|near|nearby|right below|directly below|behind it|behind the tv)\b.*\boutlet\b/,
    /\boutlet\b.*\bfar|farther|further|not close|not near\b/,
  ].some((pattern) => pattern.test(normalized));
}

export function quoteNeedsOutletDistanceFollowUp(quote: DisplayQuote, sourceMode: QuoteSourceMode, description: string): boolean {
  if (sourceMode !== "text" || descriptionProvidesOutletDistanceInfo(description)) {
    return false;
  }

  return quote.groups.some((group) => groupHasNonFireplaceWireConcealment(group));
}

export function getMountPriceLabel(size: TVConfig["size"], type: MountType): string {
  if (type === "fixed") {
    return formatPrice(size === "56+" ? pricingData.tvMounts.fixedBig.price : pricingData.tvMounts.fixedSmall.price);
  }

  if (type === "tilting") {
    return formatPrice(size === "56+" ? pricingData.tvMounts.tiltingBig.price : pricingData.tvMounts.tiltingSmall.price);
  }

  return formatPrice(size === "56+" ? pricingData.tvMounts.fullMotionBig.price : pricingData.tvMounts.fullMotionSmall.price);
}

export function normalizeAiQuote(response: FullAiQuoteResponse): DisplayQuote {
  const rawGroups: QuoteGroup[] = [];

  for (const group of response.groups ?? []) {
    if (!group.title) {
      continue;
    }

    const items: QuoteLineItem[] = [];

    for (const item of group.items ?? []) {
      const qty = Number(item.qty ?? 1);
      const price = Number(item.price ?? 0);
      const lineTotal = Number.isFinite(item.lineTotal) ? Number(item.lineTotal) : price * qty;

      if (!item.name || !Number.isFinite(qty) || !Number.isFinite(lineTotal)) {
        continue;
      }

      items.push({
        name: item.name,
        price,
        qty,
        lineTotal,
        isDiscount: item.isDiscount ?? lineTotal < 0,
      });
    }

    if (items.length === 0) {
      continue;
    }

    rawGroups.push({
      title: group.title,
      subtitle: group.subtitle,
      items,
      subtotal: Number.isFinite(group.subtotal)
        ? Number(group.subtotal)
        : items.reduce((sum, item) => sum + item.lineTotal, 0),
    });
  }

  if (rawGroups.length === 0) {
    throw new Error("No quote items were returned.");
  }

  const groups = correctAiWireConcealment(correctAiFireplacePricing(rawGroups));
  const normalizedDiscount = normalizeDiscountPresentation(groups);

  const subtotal = normalizedDiscount.groups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.lineTotal > 0).reduce((groupSum, item) => groupSum + item.lineTotal, 0),
    0,
  );
  const discount = normalizedDiscount.discount;

  return {
    groups: normalizedDiscount.groups,
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
    flags: response.flags ?? [],
    summary: response.summary?.trim() || "Here is the estimate based on the details you shared.",
    followUp: response.followUp?.trim() || undefined,
    travelTier: 0,
    travelFee: 0,
    travelContext: getTravelContext("30332"),
  };
}

export function updateTvCount(tvs: TVConfig[], count: number): TVConfig[] {
  if (tvs.length === count) {
    return tvs;
  }

  if (tvs.length > count) {
    return tvs.slice(0, count);
  }

  return [...tvs, ...Array.from({ length: count - tvs.length }, () => createDefaultTVConfig())];
}

export function updateCameraCount(cameras: CameraConfig[], count: number): CameraConfig[] {
  if (cameras.length === count) {
    return cameras;
  }

  if (cameras.length > count) {
    return cameras.slice(0, count);
  }

  return [...cameras, ...Array.from({ length: count - cameras.length }, () => createDefaultCameraConfig())];
}

export function tvDotClass(index: number): string {
  return index === 0 ? "bg-blue-500" : index === 1 ? "bg-violet-500" : index === 2 ? "bg-emerald-500" : index === 3 ? "bg-amber-500" : "bg-rose-500";
}

export function flattenQuoteItems(groups: QuoteGroup[]): Array<{ name: string; price: number; qty: number }> {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      name: group.title === "Shared Services" ? item.name : `${group.title} - ${item.name}`,
      price: item.lineTotal,
      qty: 1,
    })),
  );
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export function isValidOptionalEmail(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildLocalQuoteSummary(quote: QuoteResult, state: QuoteFormState, standaloneServices: StandaloneServices): string {
  const parts: string[] = [];

  if (state.tvs.length > 0) {
    parts.push(`${state.tvs.length} TV ${state.tvs.length === 1 ? "install" : "installs"}`);
  }

  if (state.cameras.length > 0) {
    parts.push(`${state.cameras.length} security ${state.cameras.length === 1 ? "camera" : "cameras"}`);
  }

  if (state.doorbell) {
    parts.push("doorbell install");
  }

  if (state.soundbar) {
    parts.push("soundbar setup");
  }

  if (state.surroundSound) {
    parts.push("surround sound setup");
  }

  if (state.floodlight) {
    parts.push("smart floodlight install");
  }

  if (standaloneServices.removalCount > 0) {
    parts.push(`${standaloneServices.removalCount} TV ${standaloneServices.removalCount === 1 ? "removal" : "removals"}`);
  }

  if (standaloneServices.troubleshootingMinutes > 0) {
    parts.push(`AV troubleshooting (${standaloneServices.troubleshootingMinutes} min)`);
  }

  if (standaloneServices.deviceSetup) {
    parts.push("device setup");
  }

  const serviceSummary = parts.length > 0 ? parts.join(", ") : "your installation";
  const travelSummary = "Travel and route fit are reviewed before final booking; no automatic mileage fee is added from ZIP alone.";

  return `This estimate covers ${serviceSummary}. ${travelSummary}`;
}

export function buildAugmentedQuote(baseQuote: QuoteResult, standaloneServices: StandaloneServices): QuoteResult {
  const extraItems: QuoteLineItem[] = [];
  const flags = [...baseQuote.flags];
  let extraSubtotal = 0;

  if (standaloneServices.removalCount > 0) {
    const lineTotal = pricingData.otherServices.tvUnmounting.price * standaloneServices.removalCount;
    extraItems.push({
      name: pricingData.otherServices.tvUnmounting.name,
      price: pricingData.otherServices.tvUnmounting.price,
      qty: standaloneServices.removalCount,
      lineTotal,
    });
    extraSubtotal += lineTotal;
  }

  if (standaloneServices.troubleshootingMinutes > 0) {
    extraItems.push({
      name: `AV troubleshooting (${standaloneServices.troubleshootingMinutes} min scope) — custom quote`,
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.push("Troubleshooting is custom-priced after the issue, devices, and likely scope are reviewed.");
  }

  if (standaloneServices.wireManagementLocations > 0) {
    extraItems.push({
      name: `Cable / device cleanup (${standaloneServices.wireManagementLocations} location${standaloneServices.wireManagementLocations > 1 ? "s" : ""}) — custom quote`,
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.push("Cable-management-only requests are reviewed case-by-case. The outlet-behind-TV service is the standard clean-cord solution.");
  }

  if (standaloneServices.deviceSetup) {
    extraItems.push({
      name: "Streaming / cable-box / device setup — custom quote",
      price: 0,
      qty: 1,
      lineTotal: 0,
    });
    flags.push("Device setup is custom-priced after the exact devices and requested setup are confirmed.");
  }

  if (standaloneServices.sharedUnmountCount > 0) {
    const lineTotal = pricingData.tvMounting.unmount.price * standaloneServices.sharedUnmountCount;
    extraItems.push({
      name: "Unmount existing TV(s) before install",
      price: pricingData.tvMounting.unmount.price,
      qty: standaloneServices.sharedUnmountCount,
      lineTotal,
    });
    extraSubtotal += lineTotal;
  }

  if (extraItems.length === 0) {
    return baseQuote;
  }

  return {
    ...baseQuote,
    groups: [
      ...baseQuote.groups,
      {
        title: "Additional Services",
        items: extraItems,
        subtotal: extraSubtotal,
      },
    ],
    subtotal: baseQuote.subtotal + extraSubtotal,
    total: baseQuote.total + extraSubtotal,
    flags: Array.from(new Set(flags)),
  };
}
