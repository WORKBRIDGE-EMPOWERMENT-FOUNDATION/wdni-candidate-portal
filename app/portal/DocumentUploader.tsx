"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET } from "@/lib/constants";
import { MAX_FILE_BYTES, type DocSpec } from "@/lib/form-config";
import { recordDocument, type DocRecord } from "./actions";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

export function DocumentUploader({
  spec,
  required,
  userId,
  existing,
  onUploaded,
}: {
  spec: DocSpec;
  required: boolean;
  userId: string;
  existing: DocRecord | null;
  onUploaded: (doc: DocRecord) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const accepted = spec.accept.split(",");
    if (!accepted.includes(file.type)) {
      setError(accepted.includes("application/pdf") ? "Use a JPG, PNG or PDF file." : "Use a JPG or PNG photo.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("This file is larger than 5 MB. Take a smaller photo or compress the scan.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${userId}/${spec.type}-${Date.now()}.${EXT[file.type]}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError("Upload failed. Check your connection and try again.");
        return;
      }
      const res = await recordDocument({
        docType: spec.type,
        path,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      if (!res.ok) {
        await supabase.storage.from(BUCKET).remove([path]);
        setError(res.error);
        return;
      }
      onUploaded(res.document);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function view() {
    if (!existing) return;
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(existing.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {spec.label}
            {required ? <span className="text-rose-600"> *</span> : <span className="font-normal text-slate-500"> (optional)</span>}
          </p>
          {spec.help && <p className="mt-0.5 text-xs text-slate-500">{spec.help}</p>}
          {existing && (
            <p className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
              <span aria-hidden>✓</span>
              <span className="truncate">{existing.file_name ?? "Uploaded"}</span>
              <button type="button" onClick={view} className="font-medium text-brand underline">
                View
              </button>
            </p>
          )}
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={spec.accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : existing ? "Replace" : "Upload"}
          </button>
        </div>
      </div>
    </li>
  );
}
