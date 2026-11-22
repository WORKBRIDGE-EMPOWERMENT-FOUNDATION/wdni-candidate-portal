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
    <li className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
            existing ? "bg-brand text-white" : "border-2 border-dashed border-line"
          }`}
        >
          {existing && (
            <svg viewBox="0 0 12 12" className="h-3 w-3">
              <path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">
            {spec.label}
            {!required && <span className="font-normal text-muted"> (optional)</span>}
          </p>
          {existing ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
              <span className="truncate">{existing.file_name ?? "Uploaded"}</span>
              <button type="button" onClick={view} className="shrink-0 font-semibold text-brand underline underline-offset-2">
                View
              </button>
            </p>
          ) : (
            spec.help && <p className="mt-0.5 text-sm text-muted">{spec.help}</p>
          )}
          {error && <p role="alert" className="mt-1 text-sm font-semibold text-red-800">{error}</p>}
        </div>
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={spec.accept}
          className="sr-only"
          tabIndex={-1}
          aria-label={`Upload ${spec.label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          className={existing ? "btn-secondary" : "btn-primary"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : existing ? "Replace file" : "Upload file"}
        </button>
      </div>
    </li>
  );
}
