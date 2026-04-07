import { diffMinutes, minutesToDecimalHours, decimalHoursToHHMM } from "./time";

export type TimeEntryInput = {
  clockIn: string | null;
  clockOut: string | null;
  clockIn2: string | null;
  clockOut2: string | null;
};

export function sumDayHours(entry: TimeEntryInput): number {
  const m1 = diffMinutes(entry.clockIn, entry.clockOut);
  const m2 = diffMinutes(entry.clockIn2, entry.clockOut2);
  return minutesToDecimalHours(m1 + m2);
}

export function sumWeekHours(entries: TimeEntryInput[]): number {
  return entries.reduce((acc, e) => acc + sumDayHours(e), 0);
}

export function splitRegularOvertime(
  totalHours: number,
  threshold: number
): { regular: number; overtime: number } {
  const regular = Math.min(totalHours, threshold);
  const overtime = Math.max(0, totalHours - threshold);
  return { regular, overtime };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateHourlyPay(
  entries: TimeEntryInput[],
  hourlyRate: number,
  threshold: number,
  multiplier: number
) {
  const totalHours = sumWeekHours(entries);
  const { regular, overtime } = splitRegularOvertime(totalHours, threshold);
  const regularPay = roundMoney(regular * hourlyRate);
  const overtimePay = roundMoney(overtime * hourlyRate * multiplier);
  const grossPay = roundMoney(regularPay + overtimePay);
  return {
    totalHours,
    totalHHMM: decimalHoursToHHMM(totalHours),
    regularHours: regular,
    overtimeHours: overtime,
    regularPay,
    overtimePay,
    grossPay,
  };
}

export function calculateSalaryPay(weeklyAmount: number) {
  const grossPay = roundMoney(weeklyAmount);
  return {
    totalHours: 0,
    totalHHMM: "00:00",
    regularHours: 0,
    overtimeHours: 0,
    regularPay: grossPay,
    overtimePay: 0,
    grossPay,
  };
}

export type ExtraRateSegment = { rate: number; hours: number };

export function parseExtraRateSegments(raw: unknown): ExtraRateSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraRateSegment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rate = Number((item as { rate?: unknown }).rate);
    const hours = Number((item as { hours?: unknown }).hours);
    if (
      Number.isFinite(rate) &&
      rate >= 0 &&
      Number.isFinite(hours) &&
      hours >= 0
    ) {
      out.push({ rate, hours });
    }
  }
  return out;
}

type LineSnap = {
  hourlyRateSnapshot: number | null;
  weeklySalaryAmount: number | null;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  manualRegularHours: number | null;
  manualTotalHours: number | null;
  extraRateSegments: unknown;
};

/** Hourly pay: clock-based split, optional manual reg/total override, optional extra rate rows. */
export function computeHourlyLineTotals(
  entries: TimeEntryInput[],
  line: LineSnap
) {
  const rate = line.hourlyRateSnapshot ?? 0;
  const threshold = line.overtimeThreshold;
  const mult = line.overtimeMultiplier;
  const manualReg = line.manualRegularHours;
  const manualTotal = line.manualTotalHours;
  const segments = parseExtraRateSegments(line.extraRateSegments);
  const extraStraightPay = roundMoney(
    segments.reduce((s, seg) => s + seg.rate * seg.hours, 0)
  );

  let regular: number;
  let overtime: number;

  if (
    manualReg != null &&
    manualTotal != null &&
    Number.isFinite(manualReg) &&
    Number.isFinite(manualTotal) &&
    manualTotal >= manualReg
  ) {
    regular = manualReg;
    overtime = manualTotal - manualReg;
  } else {
    const totalHours = sumWeekHours(entries);
    const split = splitRegularOvertime(totalHours, threshold);
    regular = split.regular;
    overtime = split.overtime;
  }

  const baseRegularPay = roundMoney(regular * rate);
  const overtimePay = roundMoney(overtime * rate * mult);
  const regularPay = roundMoney(baseRegularPay + extraStraightPay);
  const grossPay = roundMoney(regularPay + overtimePay);

  return {
    regularHours: regular,
    overtimeHours: overtime,
    regularPay,
    overtimePay,
    grossPay,
  };
}

export function computeLineTotals(
  payType: "HOURLY" | "SALARY",
  entries: TimeEntryInput[],
  line: LineSnap
) {
  if (payType === "SALARY") {
    const amt = line.weeklySalaryAmount ?? 0;
    return calculateSalaryPay(amt);
  }
  return computeHourlyLineTotals(entries, line);
}
