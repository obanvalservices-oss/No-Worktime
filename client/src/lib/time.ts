export function parseClockToMinutes(s: string | null | undefined): number | null {
  if (s == null || s.trim() === "") return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
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

function diffMinutes(
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
