import {
  inferDecimalPlaces,
  roundHalfUp,
} from "./decimalPrecision";
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

/** Round to 2 decimals (half-up). Prefer {@link roundHalfUp} with line precision when calculating payroll. */
export function roundTwoDecimalsHalfUp(value: number): number {
  return roundHalfUp(value, 2);
}

/** @deprecated Prefer {@link roundTwoDecimalsHalfUp} — same implementation. */
export const roundMoney = roundTwoDecimalsHalfUp;

export function calculateHourlyPay(
  entries: TimeEntryInput[],
  hourlyRate: number,
  threshold: number,
  multiplier: number
) {
  const totalHours = sumWeekHours(entries);
  const { regular, overtime } = splitRegularOvertime(totalHours, threshold);
  const regularPay = roundTwoDecimalsHalfUp(regular * hourlyRate);
  const overtimePay = roundTwoDecimalsHalfUp(overtime * hourlyRate * multiplier);
  const grossPay = roundTwoDecimalsHalfUp(regularPay + overtimePay);
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
  const prec = inferDecimalPlaces(weeklyAmount);
  const grossPay = roundHalfUp(weeklyAmount, prec);
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

export type RateBucket = "REGULAR" | "OVERTIME";

export type ExtraRateSegment = {
  rate: number;
  hours: number;
  bucket: RateBucket;
};

export function parseExtraRateSegments(raw: unknown): ExtraRateSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraRateSegment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rate = Number((item as { rate?: unknown }).rate);
    const hours = Number((item as { hours?: unknown }).hours);
    const b = (item as { bucket?: unknown }).bucket;
    const bucket: RateBucket =
      b === "OVERTIME" ? "OVERTIME" : "REGULAR";
    if (
      Number.isFinite(rate) &&
      rate >= 0 &&
      Number.isFinite(hours) &&
      hours >= 0
    ) {
      out.push({ rate, hours, bucket });
    }
  }
  return out;
}

export function sumSegmentHours(
  segments: ExtraRateSegment[],
  bucket: RateBucket
): number {
  return segments.reduce((s, seg) => {
    if (seg.bucket !== bucket) return s;
    return s + seg.hours;
  }, 0);
}

type LineSnap = {
  hourlyRateSnapshot: number | null;
  weeklySalaryAmount: number | null;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  manualRegularHours: number | null;
  manualOvertimeHours: number | null;
  extraRateSegments: unknown;
};

/** Max decimal places used on this line (from rates, hours, manual overrides, segments). */
export function inferPayrollLinePrecision(
  entries: TimeEntryInput[],
  line: LineSnap
): number {
  let max = 0;
  const consider = (n: number | null | undefined) => {
    if (n != null && Number.isFinite(n)) {
      max = Math.max(max, inferDecimalPlaces(n));
    }
  };

  consider(line.hourlyRateSnapshot);
  consider(line.weeklySalaryAmount);
  consider(line.manualRegularHours);
  consider(line.manualOvertimeHours);
  consider(line.overtimeThreshold);
  consider(line.overtimeMultiplier);

  const segments = parseExtraRateSegments(line.extraRateSegments);
  for (const seg of segments) {
    consider(seg.rate);
    consider(seg.hours);
  }

  const manualActive =
    line.manualRegularHours != null &&
    line.manualOvertimeHours != null &&
    Number.isFinite(line.manualRegularHours) &&
    Number.isFinite(line.manualOvertimeHours);

  if (!manualActive) {
    consider(sumWeekHours(entries));
    for (const e of entries) {
      consider(sumDayHours(e));
    }
  }

  return max;
}

/** Hourly pay: clock/manual base hours + optional extra rate rows (hours & $). */
export function computeHourlyLineTotals(
  entries: TimeEntryInput[],
  line: LineSnap
) {
  const prec = inferPayrollLinePrecision(entries, line);
  const round = (v: number) => roundHalfUp(v, prec);
  const rate = line.hourlyRateSnapshot ?? 0;
  const threshold = line.overtimeThreshold;
  const mult = line.overtimeMultiplier;
  const manualReg = line.manualRegularHours;
  const manualOt = line.manualOvertimeHours;
  const segments = parseExtraRateSegments(line.extraRateSegments);

  /** Core reg/OT hours from clocks or manual override (employee snapshot rate applies here). */
  let mainRegular: number;
  let mainOvertime: number;

  if (
    manualReg != null &&
    manualOt != null &&
    Number.isFinite(manualReg) &&
    Number.isFinite(manualOt) &&
    manualReg >= 0 &&
    manualOt >= 0
  ) {
    mainRegular = manualReg;
    mainOvertime = manualOt;
  } else {
    const totalHours = sumWeekHours(entries);
    const split = splitRegularOvertime(totalHours, threshold);
    mainRegular = split.regular;
    mainOvertime = split.overtime;
  }

  const hoursFromSegmentsRegular = sumSegmentHours(segments, "REGULAR");
  const hoursFromSegmentsOvertime = sumSegmentHours(segments, "OVERTIME");

  /** Display/stored hours: main (clocks or manual) + additional-rate rows in each bucket. */
  const regularHours = round(mainRegular + hoursFromSegmentsRegular);
  const overtimeHours = round(mainOvertime + hoursFromSegmentsOvertime);

  // Pay: base employee rate on main hours, then add straight $ from extra rows (sum raw, round once).
  let extraRegularPayRaw = 0;
  let extraOvertimePayRaw = 0;
  for (const seg of segments) {
    // Manual rows: enter the $/hr you want — same formula for Regular and OT buckets.
    if (seg.bucket === "OVERTIME") {
      extraOvertimePayRaw += seg.rate * seg.hours;
    } else {
      extraRegularPayRaw += seg.rate * seg.hours;
    }
  }

  const baseRegularPayRaw = mainRegular * rate;
  const baseOvertimePayRaw = mainOvertime * rate * mult;

  const regularPay = round(baseRegularPayRaw + extraRegularPayRaw);
  const overtimePay = round(baseOvertimePayRaw + extraOvertimePayRaw);
  const grossPay = round(regularPay + overtimePay);

  return {
    regularHours,
    overtimeHours,
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
