"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/constants";
import {
  ACTIVE_FIELDS, ACTIVE_DOCUMENTS, FIELD_NAMES, MAX_FILE_BYTES, missingDocuments, toDbRow, validateFields, type Values,
} from "@/lib/form-config";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function currentCandidate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: shortlistId } = await supabase.rpc("claim_shortlist");
  if (!shortlistId) return null;
  const { data: entry } = await supabase.from("shortlist").select("email").eq("id", shortlistId).single();
  return { supabase, user, shortlistId: shortlistId as string, shortlistEmail: (entry?.email as string | null) ?? null };
}

function clean(values: Values): Values {
  const out: Values = {};
  for (const [k, v] of Object.entries(values ?? {})) {
    if (FIELD_NAMES.has(k) && typeof v === "string") out[k] = v.slice(0, 2000);
  }
  return out;
}

/** Saves the whole form as a draft. Format errors are rejected; empty required fields are allowed until submit. */
export async function saveDraft(values: Values): Promise<Result> {
  const me = await currentCandidate();
  if (!me) return { ok: false, error: "Your session has expired. Please sign in again." };

  const v = clean(values);
  if (me.shortlistEmail) v.email = me.shortlistEmail; // email is fixed to the shortlist
  const formatErrors = Object.fromEntries(
    Object.entries(validateFields(ACTIVE_FIELDS, v)).filter(([, msg]) => msg !== "This field is required."),
  );
  if (Object.keys(formatErrors).length) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: formatErrors };
  }

  const { error } = await me.supabase
    .from("submissions")
    .upsert({ shortlist_id: me.shortlistId, user_id: me.user.id, ...toDbRow(v) }, { onConflict: "shortlist_id" });

  if (error) {
    return { ok: false, error: "We couldn't save your changes. If you've already submitted, your form is locked." };
  }
  return { ok: true };
}

export type DocRecord = {
  doc_type: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
};

/** Records a file the browser has just uploaded to storage, replacing any earlier file of the same type. */
export async function recordDocument(input: {
  docType: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<{ ok: true; document: DocRecord } | { ok: false; error: string }> {
  const me = await currentCandidate();
  if (!me) return { ok: false, error: "Your session has expired. Please sign in again." };

  if (!ACTIVE_DOCUMENTS.some((d) => d.type === input.docType)) return { ok: false, error: "Unknown document type." };
  if (!input.path.startsWith(`${me.user.id}/`)) return { ok: false, error: "Invalid file location." };
  if (input.size > MAX_FILE_BYTES) return { ok: false, error: "Files must be 5 MB or smaller." };

  const { data: existing } = await me.supabase
    .from("documents")
    .select("storage_path")
    .eq("shortlist_id", me.shortlistId)
    .eq("doc_type", input.docType)
    .maybeSingle();

  const { data, error } = await me.supabase
    .from("documents")
    .upsert(
      {
        shortlist_id: me.shortlistId,
        user_id: me.user.id,
        doc_type: input.docType,
        storage_path: input.path,
        file_name: input.fileName.slice(0, 200),
        mime_type: input.mimeType,
        size_bytes: input.size,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "shortlist_id,doc_type" },
    )
    .select("doc_type, storage_path, file_name, mime_type, size_bytes, uploaded_at")
    .single();

  if (error || !data) return { ok: false, error: "We couldn't save this document. Please try again." };

  if (existing?.storage_path && existing.storage_path !== input.path) {
    await me.supabase.storage.from(BUCKET).remove([existing.storage_path]);
  }
  return { ok: true, document: data as DocRecord };
}

/** Final submission: saves the latest answers, checks everything, then locks the application. */
export async function submitApplication(values: Values, declarationAccepted: boolean): Promise<Result> {
  const me = await currentCandidate();
  if (!me) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!declarationAccepted) return { ok: false, error: "Please tick the declaration to continue." };

  const v = clean(values);
  if (me.shortlistEmail) v.email = me.shortlistEmail; // email is fixed to the shortlist
  const fieldErrors = validateFields(ACTIVE_FIELDS, v);
  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: "Some answers are missing or need fixing. Go back to the highlighted sections.", fieldErrors };
  }

  const { data: docs } = await me.supabase.from("documents").select("doc_type").eq("shortlist_id", me.shortlistId);
  const missing = missingDocuments(v, (docs ?? []).map((d) => d.doc_type as string));
  if (missing.length) {
    return { ok: false, error: `Please upload: ${missing.map((d) => d.label).join(", ")}.` };
  }

  const { error: saveError } = await me.supabase
    .from("submissions")
    .upsert(
      { shortlist_id: me.shortlistId, user_id: me.user.id, ...toDbRow(v), declaration_accepted: true },
      { onConflict: "shortlist_id" },
    );
  if (saveError) return { ok: false, error: "We couldn't save your application. Please try again." };

  const { error } = await me.supabase.rpc("submit_application");
  if (error) return { ok: false, error: error.message || "We couldn't submit your application. Please try again." };

  revalidatePath("/portal");
  return { ok: true };
}
