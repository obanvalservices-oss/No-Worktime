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

/**
 * Round to exactly 2 decimal places using **half-up** (commercial rounding):
 * look at the third decimal — digits **5–9** round up, **0–4** round down.
 * Uses micro-unit scaling so values like **1.005** round to **1.01**, not **1.00**.
 * Use for **money** and **hour** totals stored or shown to 2 decimals.
 */
export function roundTwoDecimalsHalfUp(value: number): number {
  if (!Number.isFinite(value)) return value;
  if (value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const scaled = Math.round(x * 1e6);
  const units = Math.floor(scaled / 1e4 + 0.5);
  return sign * (units / 100);
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
  const grossPay = roundTwoDecimalsHalfUp(weeklyAmount);
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

/** Hourly pay: clock/manual base hours + optional extra rate rows (hours & $). */
export function computeHourlyLineTotals(
  entries: TimeEntryInput[],
  line: LineSnap
) {
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
  const regularHours = roundTwoDecimalsHalfUp(
    mainRegular + hoursFromSegmentsRegular
  );
  const overtimeHours = roundTwoDecimalsHalfUp(
    mainOvertime + hoursFromSegmentsOvertime
  );

  // Pay: base employee rate on main hours, then add straight $ from extra rows (sum raw, round once).
  let extraRegularPayRaw = 0;
  let extraOvertimePayRaw = 0;
  for (const seg of segments) {
    if (seg.bucket === "OVERTIME") {
      extraOvertimePayRaw += seg.rate * seg.hours * mult;
    } else {
      extraRegularPayRaw += seg.rate * seg.hours;
    }
  }

  const baseRegularPayRaw = mainRegular * rate;
  const baseOvertimePayRaw = mainOvertime * rate * mult;

  const regularPay = roundTwoDecimalsHalfUp(
    baseRegularPayRaw + extraRegularPayRaw
  );
  const overtimePay = roundTwoDecimalsHalfUp(
    baseOvertimePayRaw + extraOvertimePayRaw
  );
  const grossPay = roundTwoDecimalsHalfUp(regularPay + overtimePay);

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
