export type Season =
  | "new_year"
  | "valentines"
  | "spring"
  | "memorial_day"
  | "summer"
  | "labor_day"
  | "fall"
  | "halloween"
  | "veterans_day"
  | "thanksgiving"
  | "black_friday"
  | "christmas"
  | "new_years_eve"
  | "default";

export type SeasonalTheme = {
  season: Season;
  label: string;
  heroBadge: string;
  promoHeadline: string;
  promoSubtext: string;
  promoDiscount: string | null;
  promoCode: string | null;
  accentColor: string;
  bannerBg: string;
  bannerText: string;
  emoji: string;
  heroBgOverlay: string;
};

function getFourthThursdayOfNovember(year: number): Date {
  const firstDay = new Date(year, 10, 1);
  const firstThursdayOffset = (4 - firstDay.getDay() + 7) % 7;
  const thanksgivingDate = 1 + firstThursdayOffset + 21;

  return new Date(year, 10, thanksgivingDate);
}

function isBetween(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function getCurrentSeason(): Season {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const thanksgiving = getFourthThursdayOfNovember(year);
  const thanksgivingWindowStart = new Date(year, 10, thanksgiving.getDate() - 3);
  const thanksgivingWindowEnd = new Date(year, 10, thanksgiving.getDate() + 3);
  const blackFridayStart = new Date(year, 10, thanksgiving.getDate() + 1);
  const cyberMonday = new Date(year, 10, thanksgiving.getDate() + 4);

  if (month === 1 && day <= 15) return "new_year";
  if (month === 2 && day <= 14) return "valentines";
  if (month === 5 && day >= 25) return "memorial_day";
  if (month === 6 || month === 7 || month === 8) return "summer";
  if (month === 9 && day <= 7) return "labor_day";
  if (month === 10 && day >= 25) return "halloween";
  if (month === 11 && day === 11) return "veterans_day";
  if (isBetween(today, blackFridayStart, cyberMonday)) return "black_friday";
  if (isBetween(today, thanksgivingWindowStart, thanksgivingWindowEnd)) return "thanksgiving";
  if (month === 12 && day >= 15 && day <= 26) return "christmas";
  if (month === 12 && day >= 27) return "new_years_eve";
  if ((month === 3) || (month === 4) || (month === 5 && day <= 24)) return "spring";
  if ((month === 9 && day >= 8) || month === 10) return "fall";

  return "default";
}

const seasonalThemes: Record<Season, SeasonalTheme> = {
  new_year: {
    season: "new_year",
    label: "New Year Special",
    heroBadge: "🎆 New Year Special",
    promoHeadline: "$25 off any install in January",
    promoSubtext: "Start the year with a cleaner setup and a fresh wall-mounted look.",
    promoDiscount: "$25 off",
    promoCode: "NEWYEAR25",
    accentColor: "from-blue-500 to-amber-300",
    bannerBg: "bg-gradient-to-r from-blue-700 via-blue-600 to-amber-400",
    bannerText: "text-white",
    emoji: "🥂",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_40%)]",
  },
  valentines: {
    season: "valentines",
    label: "Valentine's Week",
    heroBadge: "❤️ Valentine's Week",
    promoHeadline: "Give the gift of a perfect setup - $15 off",
    promoSubtext: "A clean install makes movie night and game night feel even better.",
    promoDiscount: "$15 off",
    promoCode: "LOVEMYTV",
    accentColor: "from-rose-500 to-red-400",
    bannerBg: "bg-gradient-to-r from-rose-600 to-red-500",
    bannerText: "text-white",
    emoji: "❤️",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_transparent_45%)]",
  },
  spring: {
    season: "spring",
    label: "Spring Refresh",
    heroBadge: "🌸 Spring Refresh",
    promoHeadline: "Spring clean your setup",
    promoSubtext: "Book now and get a free wire concealment assessment for trickier layouts.",
    promoDiscount: "Free wire concealment assessment",
    promoCode: null,
    accentColor: "from-emerald-500 to-lime-400",
    bannerBg: "bg-gradient-to-r from-emerald-600 to-lime-500",
    bannerText: "text-white",
    emoji: "🌸",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_45%)]",
  },
  memorial_day: {
    season: "memorial_day",
    label: "Memorial Day Weekend",
    heroBadge: "🇺🇸 Memorial Day Weekend",
    promoHeadline: "$20 off all installs this weekend",
    promoSubtext: "Lock in your long-weekend install while the holiday rate is live.",
    promoDiscount: "$20 off",
    promoCode: "MEMDAY20",
    accentColor: "from-red-500 via-white to-blue-500",
    bannerBg: "bg-gradient-to-r from-red-600 via-slate-100 to-blue-700",
    bannerText: "text-slate-900",
    emoji: "🇺🇸",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_40%)]",
  },
  summer: {
    season: "summer",
    label: "Summer Setup Season",
    heroBadge: "☀️ Summer Setup Season",
    promoHeadline: "Game room ready? Book your install today",
    promoSubtext: "Summer projects move fast, especially before football kickoff weekends.",
    promoDiscount: null,
    promoCode: null,
    accentColor: "from-amber-400 to-orange-500",
    bannerBg: "bg-gradient-to-r from-amber-500 to-orange-500",
    bannerText: "text-slate-950",
    emoji: "☀️",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_45%)]",
  },
  labor_day: {
    season: "labor_day",
    label: "Labor Day Weekend",
    heroBadge: "🔨 Labor Day Weekend",
    promoHeadline: "$15 off - our labor, your relaxation",
    promoSubtext: "Take advantage of the long weekend and let us handle the heavy lifting.",
    promoDiscount: "$15 off",
    promoCode: "LABORDAY15",
    accentColor: "from-slate-600 to-blue-500",
    bannerBg: "bg-gradient-to-r from-slate-700 to-blue-600",
    bannerText: "text-white",
    emoji: "🔨",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_45%)]",
  },
  fall: {
    season: "fall",
    label: "Fall Setup Season",
    heroBadge: "🍂 Fall Setup Season",
    promoHeadline: "Get your man cave ready before football season",
    promoSubtext: "Wall-mount the big screen and clean up the cords before kickoff.",
    promoDiscount: null,
    promoCode: null,
    accentColor: "from-orange-500 to-amber-400",
    bannerBg: "bg-gradient-to-r from-orange-600 to-amber-500",
    bannerText: "text-white",
    emoji: "🍂",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_45%)]",
  },
  halloween: {
    season: "halloween",
    label: "Halloween Special",
    heroBadge: "🎃 Spooky Savings",
    promoHeadline: "$20 off - boo-tiful installs only",
    promoSubtext: "Spooky season is a great time to clean up the living room before guests arrive.",
    promoDiscount: "$20 off",
    promoCode: "SPOOKY20",
    accentColor: "from-orange-500 to-violet-500",
    bannerBg: "bg-gradient-to-r from-orange-500 via-slate-950 to-violet-700",
    bannerText: "text-white",
    emoji: "🎃",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.22),_transparent_40%)]",
  },
  veterans_day: {
    season: "veterans_day",
    label: "Veterans Day",
    heroBadge: "🎖️ Veterans Day",
    promoHeadline: "15% off for active military & veterans",
    promoSubtext: "Thank you for your service. Mention the code at booking and we’ll verify it with you.",
    promoDiscount: "15% off",
    promoCode: "VETDAY15",
    accentColor: "from-red-500 to-blue-500",
    bannerBg: "bg-gradient-to-r from-red-600 to-blue-700",
    bannerText: "text-white",
    emoji: "🎖️",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%)]",
  },
  thanksgiving: {
    season: "thanksgiving",
    label: "Thanksgiving Week",
    heroBadge: "🦃 Thanksgiving Week",
    promoHeadline: "Get set up before the game - $15 off",
    promoSubtext: "Perfect timing for living room upgrades before the family arrives.",
    promoDiscount: "$15 off",
    promoCode: "GOBBLE15",
    accentColor: "from-amber-500 to-orange-700",
    bannerBg: "bg-gradient-to-r from-amber-600 to-orange-700",
    bannerText: "text-white",
    emoji: "🦃",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.2),_transparent_45%)]",
  },
  black_friday: {
    season: "black_friday",
    label: "Black Friday Deal",
    heroBadge: "🛍️ Black Friday Deal",
    promoHeadline: "$30 off any install - biggest sale of the year",
    promoSubtext: "Bought a new TV? This is the best week to get it mounted.",
    promoDiscount: "$30 off",
    promoCode: "BFRIDAY30",
    accentColor: "from-yellow-300 to-amber-500",
    bannerBg: "bg-gradient-to-r from-black via-slate-900 to-yellow-400",
    bannerText: "text-white",
    emoji: "🛍️",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_45%)]",
  },
  christmas: {
    season: "christmas",
    label: "Holiday Special",
    heroBadge: "🎄 Holiday Special",
    promoHeadline: "Gift a perfect TV setup - $20 off through Dec 26",
    promoSubtext: "Perfect for holiday hosting, new gifts, and upgraded family movie nights.",
    promoDiscount: "$20 off",
    promoCode: "HOLIDAY20",
    accentColor: "from-red-500 to-emerald-500",
    bannerBg: "bg-gradient-to-r from-red-600 to-emerald-600",
    bannerText: "text-white",
    emoji: "🎄",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_35%)] before:absolute before:inset-0 before:bg-[radial-gradient(circle,_rgba(255,255,255,0.12)_1px,_transparent_1px)] before:bg-[length:24px_24px] before:opacity-40",
  },
  new_years_eve: {
    season: "new_years_eve",
    label: "New Year's Countdown",
    heroBadge: "🎆 New Year's Countdown",
    promoHeadline: "Ring in the new year with a new setup - $20 off",
    promoSubtext: "Finish the year with a cleaner, sharper entertainment setup.",
    promoDiscount: "$20 off",
    promoCode: "NYE2026",
    accentColor: "from-amber-300 to-yellow-500",
    bannerBg: "bg-gradient-to-r from-amber-300 via-yellow-400 to-slate-900",
    bannerText: "text-slate-950",
    emoji: "🥂",
    heroBgOverlay: "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.24),_transparent_40%)]",
  },
  default: {
    season: "default",
    label: "Available Now in Metro Atlanta",
    heroBadge: "⚡ Available Now in Metro Atlanta",
    promoHeadline: "Fast quotes. Clean installs. No surprises.",
    promoSubtext: "Get a clear estimate before you book and keep your install moving.",
    promoDiscount: null,
    promoCode: null,
    accentColor: "from-blue-500 to-cyan-400",
    bannerBg: "bg-blue-600",
    bannerText: "text-white",
    emoji: "⚡",
    heroBgOverlay: "",
  },
};

export function getSeasonalTheme(): SeasonalTheme {
  return seasonalThemes[getCurrentSeason()];
}
