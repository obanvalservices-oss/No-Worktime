/** Max fractional digits accepted from payroll inputs (hours, rates, pay). */
export const PAYROLL_DECIMAL_CAP = 8;

/**
 * Half-up round to a fixed number of decimal places (commercial rounding).
 */
export function roundHalfUp(value: number, decimalPlaces: number): number {
  if (!Number.isFinite(value)) return value;
  const places = Math.max(0, Math.min(decimalPlaces, PAYROLL_DECIMAL_CAP));
  if (places === 0) {
    const sign = value < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(value));
  }
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const scale = 10 ** places;
  const scaled = Math.round(x * 1e6);
  const divisor = 1e6 / scale;
  const units = Math.floor(scaled / divisor + 0.5);
  return sign * (units / scale);
}

/**
 * Infer how many decimal places a stored number was entered with.
 */
export function inferDecimalPlaces(
  n: number,
  maxPlaces = PAYROLL_DECIMAL_CAP
): number {
  if (!Number.isFinite(n)) return 0;
  for (let d = 0; d <= maxPlaces; d++) {
    if (Math.abs(roundHalfUp(n, d) - n) < 1e-9) return d;
  }
  return maxPlaces;
}

/** Decimal places from a raw form string (e.g. "10.1234" → 4). */
export function decimalPlacesFromInputString(raw: string): number {
  const t = raw.trim();
  if (!t) return 0;
  const dot = t.indexOf(".");
  if (dot === -1) return 0;
  const frac = t.slice(dot + 1).replace(/[^\d].*$/, "");
  return Math.min(frac.length, PAYROLL_DECIMAL_CAP);
}

export function formatDecimal(
  n: number | null | undefined,
  fallbackPlaces = 2
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const places = Math.max(fallbackPlaces, inferDecimalPlaces(n));
  return n.toFixed(places);
}
