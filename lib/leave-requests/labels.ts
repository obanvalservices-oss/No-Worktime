import type { LeaveRequestType } from "@prisma/client";
import type { LeaveTypeLabel } from "./buildApprovalPdf";

export function leaveTypeLabel(type: LeaveRequestType): LeaveTypeLabel {
  return type === "VACATION" ? "Vacation" : "Sick leave";
}

export function leaveTypeShort(type: LeaveRequestType): string {
  return type === "VACATION" ? "Vacation" : "Sick";
}
