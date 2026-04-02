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

type LineSnap = {
  hourlyRateSnapshot: number | null;
  weeklySalaryAmount: number | null;
  overtimeThreshold: number;
  overtimeMultiplier: number;
};

export function computeLineTotals(
  payType: "HOURLY" | "SALARY",
  entries: TimeEntryInput[],
  line: LineSnap
) {
  if (payType === "SALARY") {
    const amt = line.weeklySalaryAmount ?? 0;
    return calculateSalaryPay(amt);
  }
  const rate = line.hourlyRateSnapshot ?? 0;
  return calculateHourlyPay(
    entries,
    rate,
    line.overtimeThreshold,
    line.overtimeMultiplier
  );
}
