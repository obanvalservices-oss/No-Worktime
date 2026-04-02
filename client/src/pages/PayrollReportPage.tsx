import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { sumDayHours } from "../lib/time";

interface TimeEntry {
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  clockIn2: string | null;
  clockOut2: string | null;
}

interface Line {
  id: string;
  employee: { name: string; payType: string; department: { name: string } };
  regularHours: number | null;
  overtimeHours: number | null;
  regularPay: number | null;
  overtimePay: number | null;
  grossPay: number | null;
  timeEntries: TimeEntry[];
}

interface Run {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  company: { name: string };
  lines: Line[];
}

export default function PayrollReportPage() {
  const { id: runId } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    if (!runId) return;
    void api.get<Run>(`/api/payroll/${runId}`).then((r) => setRun(r.data));
  }, [runId]);

  const print = () => window.print();

  if (!run) {
    return <div className="text-[var(--muted)] p-8">Loading…</div>;
  }

  const totals = run.lines.reduce(
    (a, l) => ({
      reg: a.reg + (l.regularPay ?? 0),
      ot: a.ot + (l.overtimePay ?? 0),
      gross: a.gross + (l.grossPay ?? 0),
    }),
    { reg: 0, ot: 0, gross: 0 }
  );

  return (
    <div className="max-w-4xl mx-auto print:max-w-none">
      <div className="no-print mb-6 flex gap-3">
        <Link
          to={`/payroll/${run.id}`}
          className="text-sm text-teal-600 hover:underline"
        >
          ← Back to payroll run
        </Link>
        <button
          type="button"
          onClick={print}
          className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium"
        >
          Print / Save PDF
        </button>
      </div>

      <header className="mb-8 border-b border-[var(--border)] pb-4">
        <h1 className="text-2xl font-semibold">Payroll summary</h1>
        <p className="text-[var(--muted)]">{run.company.name}</p>
        <p className="text-sm mt-1">
          Period {run.startDate} — {run.endDate} · {run.status}
        </p>
      </header>

      <table className="w-full text-sm border-collapse mb-8">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="py-2 pr-2">Employee</th>
            <th className="py-2 pr-2">Dept</th>
            <th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2 text-right">Reg. pay</th>
            <th className="py-2 pr-2 text-right">OT pay</th>
            <th className="py-2 text-right">Gross</th>
          </tr>
        </thead>
        <tbody>
          {run.lines.map((l) => (
            <tr key={l.id} className="border-b border-[var(--border)]">
              <td className="py-2 pr-2">{l.employee.name}</td>
              <td className="py-2 pr-2 text-[var(--muted)]">
                {l.employee.department.name}
              </td>
              <td className="py-2 pr-2">{l.employee.payType}</td>
              <td className="py-2 pr-2 text-right font-mono">
                {l.regularPay != null ? `$${l.regularPay.toFixed(2)}` : "—"}
              </td>
              <td className="py-2 pr-2 text-right font-mono">
                {l.overtimePay != null ? `$${l.overtimePay.toFixed(2)}` : "—"}
              </td>
              <td className="py-2 text-right font-mono font-medium">
                {l.grossPay != null ? `$${l.grossPay.toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold border-t-2 border-[var(--border)]">
            <td colSpan={3} className="py-3 text-right pr-2">
              Totals
            </td>
            <td className="py-3 text-right pr-2 font-mono">
              ${totals.reg.toFixed(2)}
            </td>
            <td className="py-3 text-right pr-2 font-mono">
              ${totals.ot.toFixed(2)}
            </td>
            <td className="py-3 text-right font-mono">${totals.gross.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="text-sm space-y-6 print:break-inside-avoid">
        <h2 className="font-semibold text-lg">Hourly detail</h2>
        {run.lines
          .filter((l) => l.employee.payType === "HOURLY")
          .map((l) => (
            <div key={l.id} className="mb-4">
              <div className="font-medium mb-2">{l.employee.name}</div>
              <table className="w-full text-xs border border-[var(--border)]">
                <thead>
                  <tr className="bg-[var(--bg)]">
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {l.timeEntries.map((te) => (
                    <tr key={te.workDate} className="border-t border-[var(--border)]">
                      <td className="p-2">{te.workDate}</td>
                      <td className="p-2 text-right font-mono">
                        {sumDayHours(te).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    </div>
  );
}
