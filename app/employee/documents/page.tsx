"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";
import ScreenLoading from "@/components/ScreenLoading";
import { FileText } from "lucide-react";

interface DocItem {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  status: "PENDING_SIGNATURE" | "SIGNED";
  signedAt: string | null;
  createdAt: string;
  company: { id: string; name: string };
}

export default function EmployeeDocumentsListPage() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await api.get<{
          linked: boolean;
          documents: DocItem[];
          message?: string;
        }>("/api/employee/documents");
        setLinked(data.linked);
        setDocuments(data.documents);
        setMessage(data.message ?? null);
      } catch (e) {
        setLoadError(axiosErrorMessage(e, "Could not load documents."));
        setLinked(null);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <ScreenLoading message="Loading documents…" subtle />;
  }

  if (loadError) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Documents</h1>
        <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-[var(--accent-deep)] dark:text-[var(--accent-light)] underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (linked === false) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Documents</h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          {message ??
            "Your employer must link your portal login to your employee record before documents appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Documents</h1>
        <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
          Open a file to review it, then sign when you are ready. Signed copies are kept
          for your employer&apos;s records.
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No documents assigned yet.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((d, i) => (
            <motion.li
              key={d.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="rounded-lg bg-[var(--accent-muted)]/40 p-2 text-[var(--accent-deep)] dark:text-[var(--accent-light)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text)] truncate">{d.title}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {d.company.name} · {d.fileName}
                  </div>
                  <div className="text-xs mt-1">
                    {d.status === "SIGNED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Signed
                        {d.signedAt
                          ? ` · ${new Date(d.signedAt).toLocaleString()}`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">
                        Pending signature
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {d.status === "PENDING_SIGNATURE" ? (
                  <Link
                    href={`/employee/documents/${d.id}/sign`}
                    className="inline-flex justify-center rounded-lg bg-[var(--accent-deep)] text-white px-3 py-2 text-sm font-medium"
                  >
                    Review &amp; sign
                  </Link>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
