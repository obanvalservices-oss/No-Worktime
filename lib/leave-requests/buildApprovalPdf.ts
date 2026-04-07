import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type LeaveTypeLabel = "Vacation" | "Sick leave";

export async function buildLeaveApprovalPdf(input: {
  companyName: string;
  employeeName: string;
  typeLabel: LeaveTypeLabel;
  startDate: string;
  endDate: string;
  reason: string;
  notes: string | null;
  approvedByEmail: string;
  approvedAtIso: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  const left = 50;
  const line = (size: number, text: string, useBold = false) => {
    const f = useBold ? bold : font;
    const lines = wrapText(text, 80);
    for (const ln of lines) {
      page.drawText(ln, {
        x: left,
        y,
        size,
        font: f,
        color: rgb(0.1, 0.1, 0.12),
      });
      y -= size + 4;
    }
  };

  line(18, "Approved leave — acknowledgment", true);
  y -= 6;
  line(10, `Company: ${input.companyName}`);
  line(10, `Employee: ${input.employeeName}`);
  line(10, `Type: ${input.typeLabel}`);
  line(10, `Dates: ${input.startDate} through ${input.endDate}`);
  y -= 8;
  line(11, "Reason (from request):", true);
  line(10, input.reason || "—");
  if (input.notes?.trim()) {
    y -= 4;
    line(11, "Additional notes:", true);
    line(10, input.notes.trim());
  }
  y -= 12;
  line(10, `Approved by: ${input.approvedByEmail}`);
  line(10, `Approved on: ${new Date(input.approvedAtIso).toLocaleString()}`);
  y -= 16;
  line(
    11,
    "By signing below, you confirm the dates and type above and acknowledge this approval.",
    true
  );
  line(
    9,
    "This form was generated after your manager approved your leave request. Sign digitally on the next step in the portal."
  );

  return pdf.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) out.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}
