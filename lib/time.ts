/**
 * Normalize user input to `HH:mm` or null (empty / invalid).
 * Accepts: `09:05`, `9:5`, `0905`, `930` (9:30), `9` / `09` (hour only → :00).
 */
export function normalizeClockString(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (t === "") return null;

  if (t.includes(":")) {
    const parts = t.split(":");
    if (parts.length < 2) return null;
    const h = Number(parts[0].trim());
    const minPart = parts[1].trim().replace(/[^\d].*$/, "");
    const min = Number(minPart);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  const digits = t.replace(/\D/g, "");
  if (digits === "") return null;

  let h: number;
  let min: number;

  if (digits.length <= 2) {
    h = parseInt(digits, 10);
    min = 0;
  } else if (digits.length === 3) {
    const n = parseInt(digits, 10);
    h = Math.floor(n / 100);
    min = n % 100;
  } else if (digits.length === 4) {
    h = parseInt(digits.slice(0, 2), 10);
    min = parseInt(digits.slice(2, 4), 10);
  } else {
    const d = digits.slice(0, 4);
    h = parseInt(d.slice(0, 2), 10);
    min = parseInt(d.slice(2, 4), 10);
  }

  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseClockToMinutes(s: string | null | undefined): number | null {
  const normalized = normalizeClockString(s);
  if (normalized == null) return null;
  const m = normalized.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h * 60 + min;
}

export function minutesToDecimalHours(minutes: number): number {
  return Math.round((minutes / 60) * 10000) / 10000;
}

export function decimalHoursToHHMM(decimal: number): string {
  const totalMin = Math.round(decimal * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function diffMinutes(
  start: string | null | undefined,
  end: string | null | undefined
): number {
  const a = parseClockToMinutes(start);
  const b = parseClockToMinutes(end);
  if (a == null || b == null) return 0;
  if (b <= a) return 0;
  return b - a;
}

export function sumDayHours(entry: {
  clockIn?: string | null;
  clockOut?: string | null;
  clockIn2?: string | null;
  clockOut2?: string | null;
}): number {
  const m1 = diffMinutes(entry.clockIn, entry.clockOut);
  const m2 = diffMinutes(entry.clockIn2, entry.clockOut2);
  return minutesToDecimalHours(m1 + m2);
}

export function sumWeekHours(
  entries: Array<{
    clockIn?: string | null;
    clockOut?: string | null;
    clockIn2?: string | null;
    clockOut2?: string | null;
  }>
): number {
  return entries.reduce((acc, e) => acc + sumDayHours(e), 0);
}
