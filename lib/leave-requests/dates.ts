/** Expect YYYY-MM-DD */
export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function assertValidLeaveRange(startDate: string, endDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return false;
  }
  return compareIsoDates(startDate, endDate) <= 0;
}
