"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";

interface DocMeta {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  status: "PENDING_SIGNATURE" | "SIGNED";
  company: { name: string };
}

export default function SignDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = String(params.documentId ?? "");
  const padRef = useRef<SignaturePadHandle>(null);

  const [meta, setMeta] = useState<DocMeta | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void (async () => {
      try {
        const { data: m } = await api.get<DocMeta>(`/api/employee/documents/${documentId}`);
        if (cancelled) return;
        setMeta(m);
        if (m.status !== "PENDING_SIGNATURE") {
          return;
        }
        const { data } = await api.get<Blob>(
          `/api/employee/documents/${documentId}/file?part=original`,
          { responseType: "blob" }
        );
        if (cancelled) return;
        url = URL.createObjectURL(data);
        setBlobUrl(url);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            axios.isAxiosError(e) &&
            (e.response?.data as { message?: string })?.message
              ? String((e.response?.data as { message?: string }).message)
              : "Could not load document";
          setLoadErr(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId]);

  const submit = async () => {
    if (!ack || !typedName.trim()) return;
    const dataUrl = padRef.current?.toDataURL();
    if (!dataUrl || dataUrl.length < 100) {
      alert("Please draw your signature in the box.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/employee/documents/${documentId}/sign`, {
        acknowledged: true,
        typedName: typedName.trim(),
        signatureImageBase64: dataUrl,
      });
      router.replace("/employee/documents");
      router.refresh();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        (e.response?.data as { message?: string })?.message
          ? String((e.response?.data as { message?: string }).message)
          : "Submit failed";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadErr) {
    return (
      <div className="max-w-lg space-y-3">
        <p className="text-red-600 dark:text-red-400 text-sm">{loadErr}</p>
        <Link href="/employee/documents" className="text-sm text-[var(--accent-deep)] underline">
          Back to documents
        </Link>
      </div>
    );
  }

  if (!meta) {
    return <p className="text-[var(--muted)] text-sm">Loading…</p>;
  }

  if (meta.status !== "PENDING_SIGNATURE") {
    return (
      <div className="max-w-lg space-y-3">
        <p className="text-sm text-[var(--muted)]">This document is already signed.</p>
        <Link href="/employee/documents" className="text-sm text-[var(--accent-deep)] underline">
          Back to documents
        </Link>
      </div>
    );
  }

  const isPdf = meta.mimeType === "application/pdf";

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <Link
          href="/employee/documents"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] mb-2 inline-block"
        >
          ← Documents
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">{meta.title}</h1>
        <p className="text-xs text-[var(--muted)] mt-1">{meta.company.name}</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] overflow-hidden min-h-[240px]">
        {blobUrl ? (
          isPdf ? (
            <iframe
              title="Document preview"
              src={blobUrl}
              className="w-full h-[min(70vh,560px)] border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt=""
              className="max-w-full max-h-[min(70vh,560px)] mx-auto block"
            />
          )
        ) : (
          <div className="p-8 text-center text-[var(--muted)] text-sm">Loading preview…</div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5">
        <p className="text-sm text-[var(--text)]">
          Sign below to confirm you have read this document. Your signature and name will
          be stored with the file for {meta.company.name}.
        </p>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Full name</label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            placeholder="Type your legal name"
            autoComplete="name"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-[var(--muted)]">Draw signature</span>
            <button
              type="button"
              onClick={() => padRef.current?.clear()}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Clear
            </button>
          </div>
          <SignaturePad ref={padRef} />
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1 rounded border-[var(--border)]"
          />
          <span>I acknowledge this is my signature and that I have reviewed the document.</span>
        </label>

        <button
          type="button"
          disabled={submitting || !ack || !typedName.trim()}
          onClick={() => void submit()}
          className="rounded-lg bg-[var(--accent-deep)] text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit signature"}
        </button>
      </div>
    </div>
  );
}
