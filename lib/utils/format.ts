/**
 * Display formatters — French locale by default.
 *
 * UI strings shown to end users (pharmacists, e-commerce managers) are in
 * French, so all date and number formatting follows fr-FR conventions.
 */

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const PERCENT_FMT = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const CURRENCY_FMT = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return DATE_FMT.format(d);
}

export function formatDateTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return DATETIME_FMT.format(d);
}

/** Format a percentage value (already in percent points, e.g. 42.5 -> "+43 %"). */
export function formatPercent(value: number, { withSign = true }: { withSign?: boolean } = {}): string {
  const rounded = Math.round(value);
  const formatted = PERCENT_FMT.format(Math.abs(rounded));
  if (!withSign) return `${formatted} %`;
  if (rounded > 0) return `+${formatted} %`;
  if (rounded < 0) return `-${formatted} %`;
  return `0 %`;
}

/** Format a score out of 100 as "NN/100". */
export function formatScore(value: number): string {
  return `${Math.round(value)}/100`;
}

/** Format euros from a number of cents. */
export function formatEurosFromCents(cents: number): string {
  return CURRENCY_FMT.format(cents / 100);
}

/** Format euros from a number of euros. */
export function formatEuros(euros: number): string {
  return CURRENCY_FMT.format(euros);
}

/** ISO week label, e.g. "2026-W22". */
export function isoWeek(input: Date = new Date()): string {
  const d = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
