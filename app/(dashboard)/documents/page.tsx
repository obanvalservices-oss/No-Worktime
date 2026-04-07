"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";
import { FileText, Download } from "lucide-react";
import { openAuthBlobUrl } from "@/lib/openAuthBlob";

interface DocRow {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  status: "PENDING_SIGNATURE" | "SIGNED";
  signedAt: string | null;
  createdAt: string;
  employee: { id: string; name: string };
  uploadedBy: { id: string; email: string };
}

interface EmployeeOpt {
  id: string;
  name: string;
}

export default function EmployerDocumentsPage() {
  const { company } = useCompany();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");

  const loadDocs = async () => {
    if (!company) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError(null);
    try {
      const q = filterEmployeeId
        ? `?employeeId=${encodeURIComponent(filterEmployeeId)}`
        : "";
      const { data } = await api.get<DocRow[]>(
        `/api/companies/${company.id}/documents${q}`
      );
      setRows(data);
    } catch (e) {
      setListError(axiosErrorMessage(e, "Could not load documents."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!company) return;
    setEmployeesError(null);
    try {
      const { data } = await api.get<EmployeeOpt[]>(
        `/api/employees/company/${company.id}`
      );
      setEmployees(data.map((e) => ({ id: e.id, name: e.name })));
      if (data.length && !employeeId) setEmployeeId(data[0].id);
    } catch (e) {
      setEmployeesError(axiosErrorMessage(e, "Could not load employees."));
      setEmployees([]);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, [company?.id]);

  useEffect(() => {
    void loadDocs();
  }, [company?.id, filterEmployeeId]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !title.trim() || !employeeId || !file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("employeeId", employeeId);
      fd.append("file", file);
      await api.post(`/api/companies/${company.id}/documents`, fd);
      setTitle("");
      setFile(null);
      await loadDocs();
    } catch (err) {
      setUploadError(axiosErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  if (!company) {
    return (
      <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg">
        Select a company in the header, or create one from the dashboard, to manage documents.
      </p>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Documents</h1>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
          Upload PDF or image files for a specific employee. The employee must have their
          portal account linked on the Employees page before they can see assignments.
          After they sign in, they review and sign in the portal. Signed records stay
          available here for download (original + signature image).
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={upload}
        className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)] space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
          <FileText className="w-4 h-4" />
          Assign document to employee
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Title (e.g. Handbook acknowledgment)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm sm:col-span-2"
            required
          />
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            required
          >
            {employees.length === 0 ? (
              <option value="">Add employees first</option>
            ) : (
              employees.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.name}
                </option>
              ))
            )}
          </select>
          <input
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-[var(--muted)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--accent-muted)] file:px-3 file:py-1.5"
            required
          />
        </div>
        {uploadError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {uploadError}
          </p>
        ) : null}
        {employeesError ? (
          <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
            {employeesError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={uploading || employees.length === 0}
          className="rounded-lg bg-[var(--accent-deep)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </motion.form>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-[var(--muted)]">Filter by employee</label>
        <select
          value={filterEmployeeId}
          onChange={(e) => setFilterEmployeeId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {employees.map((em) => (
            <option key={em.id} value={em.id}>
              {em.name}
            </option>
          ))}
        </select>
      </div>

      {listError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Employee</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Uploaded</th>
              <th className="p-3 font-medium">Files</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-[var(--muted)] text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-[var(--muted)] text-center">
                  No documents yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-medium text-[var(--text)]">{r.title}</td>
                  <td className="p-3">{r.employee.name}</td>
                  <td className="p-3">
                    <span
                      className={
                        r.status === "SIGNED"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-300"
                      }
                    >
                      {r.status === "SIGNED" ? "Signed" : "Pending signature"}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--muted)] whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void openAuthBlobUrl(
                            `/api/companies/${company.id}/documents/${r.id}/file?part=original`
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-[var(--accent-deep)] dark:text-[var(--accent-light)] hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Original
                      </button>
                      {r.status === "SIGNED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void openAuthBlobUrl(
                              `/api/companies/${company.id}/documents/${r.id}/file?part=signature`
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs text-[var(--accent-deep)] dark:text-[var(--accent-light)] hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Signature
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
