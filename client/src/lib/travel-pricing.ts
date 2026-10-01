// travel-pricing.ts
// Real fuel-cost based travel pricing for Picture Perfect TV Install
// Vehicle: 2021 VW Atlas, ~20 MPG real-world Atlanta combined
// Gas price reference: ~$3.50/gal Atlanta (update COST_PER_MILE if prices change)
// Round-trip fuel cost = (one-way miles x 2) x COST_PER_MILE
// Fee = round up to nearest $10 increment, min $0 within free zone

export type DayType = "weekday" | "weekend";
export type TravelTier = 0 | 1 | 2 | 3 | 4 | "out_of_range";

const COST_PER_MILE = 0.175; // $3.50 gas / 20 MPG

// Origin coordinates (approximate zip centroids)
// Weekday: Georgia Tech area (30332) - Midtown Atlanta
// Weekend: Decatur home area (30034)

// Travel fee calculation:
// Tier 0: 0-10 mi one-way = $0 (round trip fuel < $4, not worth charging)
// Tier 1: 11-18 mi one-way = $10 (round trip ~$4-$7 fuel)
// Tier 2: 19-26 mi one-way = $20 (round trip ~$7-$10 fuel)
// Tier 3: 27-35 mi one-way = $35 (round trip ~$10-$13 fuel + time value)
// Tier 4: 36-45 mi one-way = $50 (round trip ~$13-$17 fuel + significant time)
// Out of range: > 45 miles one-way - call for custom quote

export const TRAVEL_FEE: Record<0 | 1 | 2 | 3 | 4, number> = {
  0: 0,
  1: 10,
  2: 20,
  3: 35,
  4: 50,
};

const ONE_WAY_MILES_ESTIMATE: Record<0 | 1 | 2 | 3 | 4, number> = {
  0: 8,
  1: 15,
  2: 23,
  3: 31,
  4: 41,
};

// WEEKDAY TIERS - distances from Georgia Tech / Midtown (30332)
// Tier 0: 0-10 miles (roughly inside I-285 perimeter near Midtown)
const WEEKDAY_TIERS: Record<string, TravelTier> = {
  // Tier 0 — Core Atlanta, Midtown, Buckhead, Virginia Highlands, Inman Park
  // Grant Park, Old Fourth Ward, West End, Vine City (0-10 mi from GT)
  "30301": 0, "30302": 0, "30303": 0, "30304": 0, "30305": 0,
  "30306": 0, "30307": 0, "30308": 0, "30309": 0, "30310": 0,
  "30311": 0, "30312": 0, "30313": 0, "30314": 0, "30315": 0,
  "30316": 0, "30317": 0, "30318": 0, "30319": 0, "30324": 0,
  "30326": 0, "30327": 0, "30331": 0, "30332": 0, "30334": 0,
  "30336": 0, "30339": 0, "30342": 0, "30344": 0, "30363": 0,
  "30354": 0,

  // Tier 1 — $10: 11-18 miles from GT
  // Decatur, Smyrna, East Point, College Park, Mableton, Hapeville
  "30030": 1, "30032": 1, "30033": 1, "30034": 1, "30035": 1,
  "30080": 1, "30082": 1, "30337": 1, "30349": 1, "30260": 1,
  "30060": 1, "30062": 1,

  // Tier 2 — $20: 19-26 miles from GT
  // Marietta, Tucker, Stone Mountain, Lithia Springs, Morrow, Riverdale
  "30064": 2, "30066": 2, "30067": 2, "30068": 2,
  "30083": 2, "30084": 2, "30085": 2, "30086": 2, "30087": 2, "30088": 2,
  "30126": 2, "30058": 2, "30273": 2, "30274": 2,

  // Tier 3 — $35: 27-35 miles from GT
  // Kennesaw, Norcross, Duluth, McDonough, Stockbridge, Lithonia
  "30144": 3, "30152": 3, "30093": 3, "30096": 3, "30097": 3,
  "30038": 3, "30253": 3, "30252": 3, "30281": 3,

  // Tier 4 — $50: 36-45 miles from GT
  // Alpharetta, Roswell, Lawrenceville, Buford, Peachtree City, Newnan
  "30004": 4, "30005": 4, "30009": 4, "30022": 4, "30023": 4,
  "30075": 4, "30076": 4, "30043": 4, "30044": 4, "30045": 4, "30046": 4,
  "30269": 4, "30265": 4, "30263": 4,
};

// WEEKEND TIERS - distances from Decatur home (30034)
// Decatur is about 6 miles east of downtown, so the free zone shifts east
const WEEKEND_TIERS: Record<string, TravelTier> = {
  // Tier 0 — $0: 0-10 miles from Decatur home
  // Decatur, Scottdale, Stone Mountain, Clarkston, Avondale Estates
  // Kirkwood, East Atlanta, Edgewood
  "30030": 0, "30032": 0, "30033": 0, "30034": 0, "30035": 0,
  "30316": 0, "30317": 0, "30307": 0, "30312": 0, "30315": 0,
  "30083": 0, "30084": 0, "30085": 0, "30086": 0, "30087": 0, "30088": 0,

  // Tier 1 — $10: 11-18 miles from Decatur
  // Central Atlanta, Buckhead, Druid Hills, East Point, College Park
  // Tucker, Chamblee, Doraville
  "30301": 1, "30303": 1, "30305": 1, "30306": 1, "30308": 1,
  "30309": 1, "30310": 1, "30311": 1, "30313": 1, "30314": 1,
  "30318": 1, "30319": 1, "30324": 1, "30326": 1,
  "30260": 1, "30337": 1, "30349": 1, "30354": 1,
  "30340": 1, "30341": 1, "30360": 1,

  // Tier 2 — $20: 19-26 miles from Decatur
  // Buckhead far north, Smyrna, Marietta south, Norcross, Lilburn
  // Morrow, Riverdale, McDonough north
  "30327": 2, "30342": 2, "30339": 2, "30344": 2, "30336": 2,
  "30363": 2, "30331": 2,
  "30080": 2, "30082": 2, "30060": 2, "30062": 2,
  "30093": 2, "30096": 2, "30047": 2, "30058": 2,
  "30273": 2, "30274": 2, "30253": 2,

  // Tier 3 — $35: 27-35 miles from Decatur
  // Kennesaw, Alpharetta south, Duluth, Lawrenceville west
  // Stockbridge, Jonesboro, Peachtree City north
  "30064": 3, "30066": 3, "30067": 3, "30068": 3,
  "30126": 3, "30144": 3, "30152": 3,
  "30097": 3, "30043": 3, "30044": 3,
  "30281": 3, "30252": 3, "30038": 3,

  // Tier 4 — $50: 36-45 miles from Decatur
  // Alpharetta, Roswell, Buford, Lawrenceville east
  // Peachtree City, Newnan, McDonough south
  "30004": 4, "30005": 4, "30009": 4, "30022": 4, "30023": 4,
  "30075": 4, "30076": 4, "30045": 4, "30046": 4,
  "30269": 4, "30265": 4, "30263": 4,
};

export function getDayType(): DayType {
  const day = new Date().getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getOriginLabel(): string {
  return getDayType() === "weekday"
    ? "Midtown Atlanta (Georgia Tech)"
    : "Decatur";
}

export function getAvailabilityNote(): string | null {
  if (getDayType() === "weekday") {
    return "Weekday appointments start at 5:30 PM — we come from Midtown.";
  }
  return null;
}

export function getTravelDayLabel(dayType: DayType): string {
  return dayType === "weekday" ? "weekdays" : "weekends";
}

export function getTravelTier(zip: string): TravelTier {
  const tiers = getDayType() === "weekday" ? WEEKDAY_TIERS : WEEKEND_TIERS;
  return tiers[zip] ?? "out_of_range";
}

export function getTravelFee(_zip: string): number | "out_of_range" {
  // Current policy: do not auto-apply mileage/travel fees from ZIP alone.
  // Distance, route fit, access, and the total ticket are reviewed case-by-case.
  return 0;
}

export function getTravelContext(zip: string): {
  fee: number | "out_of_range";
  tier: TravelTier;
  dayType: DayType;
  origin: string;
  availabilityNote: string | null;
  feeLabel: string;
  oneWayMiles: number | null;
  roundTripMiles: number | null;
} {
  const dayType = getDayType();
  const tier = getTravelTier(zip);
  const fee = getTravelFee(zip);
  const origin = getOriginLabel();
  const availabilityNote = getAvailabilityNote();
  const oneWayMiles = tier === "out_of_range" ? null : ONE_WAY_MILES_ESTIMATE[tier];
  const roundTripMiles = oneWayMiles === null ? null : oneWayMiles * 2;

  const feeLabel = tier === "out_of_range"
    ? "Route review required"
    : "Travel reviewed before booking";

  return { fee, tier, dayType, origin, availabilityNote, feeLabel, oneWayMiles, roundTripMiles };
}

// Area name lookup for ZIP code display
const ZIP_AREA_NAMES: Record<string, string> = {
  "30004": "Alpharetta", "30005": "Alpharetta", "30009": "Alpharetta",
  "30022": "Roswell", "30023": "Roswell", "30075": "Roswell", "30076": "Roswell",
  "30030": "Decatur", "30032": "Decatur", "30033": "Decatur", "30034": "Decatur",
  "30035": "Decatur",
  "30043": "Lawrenceville", "30044": "Lawrenceville", "30045": "Lawrenceville",
  "30046": "Lawrenceville",
  "30060": "Marietta", "30062": "Marietta", "30064": "Marietta",
  "30066": "Marietta", "30067": "Marietta", "30068": "Marietta",
  "30080": "Smyrna", "30082": "Smyrna",
  "30083": "Stone Mountain", "30084": "Stone Mountain", "30087": "Stone Mountain",
  "30085": "Tucker", "30086": "Tucker", "30088": "Tucker",
  "30093": "Norcross", "30096": "Duluth", "30097": "Duluth",
  "30126": "Mableton", "30144": "Kennesaw", "30152": "Kennesaw",
  "30252": "McDonough", "30253": "McDonough",
  "30260": "Morrow", "30263": "Newnan", "30265": "Newnan",
  "30269": "Peachtree City", "30273": "Riverdale", "30274": "Riverdale",
  "30281": "Stockbridge",
  "30301": "Atlanta", "30303": "Atlanta", "30305": "Buckhead",
  "30306": "Virginia Highlands", "30307": "Inman Park / Decatur",
  "30308": "Midtown", "30309": "Midtown", "30310": "West End",
  "30311": "Southwest Atlanta", "30312": "Grant Park", "30313": "Downtown",
  "30314": "Vine City", "30315": "South Atlanta", "30316": "East Atlanta",
  "30317": "Kirkwood", "30318": "West Midtown", "30319": "Brookhaven",
  "30324": "Buckhead / Lindbergh", "30326": "Buckhead",
  "30327": "Buckhead West", "30331": "Southwest Atlanta",
  "30332": "Georgia Tech", "30334": "Capitol Hill",
  "30336": "Cascade", "30337": "College Park", "30339": "Vinings",
  "30340": "Chamblee", "30341": "Chamblee", "30342": "Sandy Springs",
  "30344": "East Point", "30349": "South Fulton", "30354": "Hapeville",
  "30360": "Doraville", "30363": "Atlantic Station",
  "30038": "Lithonia", "30058": "Lithonia",
};

export function getAreaName(zip: string): string {
  return ZIP_AREA_NAMES[zip] || zip;
}
