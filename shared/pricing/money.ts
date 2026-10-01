// Money helpers. The engine works in integer cents so results are deterministic
// and free of floating point drift. Dollars only appear at display boundaries.

export type Cents = number;

export function toCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}

export function toDollars(cents: Cents): number {
  return cents / 100;
}

/** Round to the nearest integer number of cents, guarding against NaN/Infinity/negatives. */
export function safeCents(value: number): Cents {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function roundToStep(cents: Cents, stepCents: Cents, mode: "nearest" | "up" | "down" = "nearest"): Cents {
  if (!Number.isFinite(cents)) return 0;
  const step = Math.max(1, Math.round(stepCents));
  const q = cents / step;
  const rounded = mode === "up" ? Math.ceil(q - 1e-9) : mode === "down" ? Math.floor(q + 1e-9) : Math.round(q);
  return Math.max(0, rounded * step);
}

export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

/** Whole-dollar display when the amount is a whole dollar, otherwise cents. */
export function formatDollarsShort(cents: Cents): string {
  return cents % 100 === 0 ? `$${(cents / 100).toLocaleString("en-US")}` : formatCents(cents);
}
