export function enumerateInclusiveDates(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T12:00:00.000Z`);
  const last = new Date(`${end}T12:00:00.000Z`);
  if (cur > last) return out;
  for (let d = cur.getTime(); d <= last.getTime(); d += 86400000) {
    out.push(new Date(d).toISOString().slice(0, 10));
  }
  return out;
}

export function assertSevenDayPeriod(start: string, end: string): void {
  const days = enumerateInclusiveDates(start, end);
  if (days.length !== 7) {
    throw new Error("Payroll period must be exactly 7 consecutive days");
  }
}
