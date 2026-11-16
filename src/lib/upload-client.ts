import { MAX_UPLOAD_BYTES } from "@/lib/validation/document";

export const ACCEPTED_UPLOAD_MIME = ["image/jpeg", "image/png", "application/pdf"] as const;

export async function uploadDocumentClient(
  file: File,
  fields: { type: string; listingCode?: string; as?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!(ACCEPTED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Invalid file type. Upload a JPG, PNG or PDF." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is too large. Maximum 5 MB." };
  }

  const form = new FormData();
  form.append("type", fields.type);
  form.append("file", file);
  if (fields.listingCode !== undefined) {
    form.append("listingCode", fields.listingCode);
  }
  if (fields.as !== undefined) {
    form.append("as", fields.as);
  }

  let res: Response;
  try {
    res = await fetch("/api/documents", { method: "POST", body: form });
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }

  if (!res.ok) {
    let bodyError: string | undefined;
    try {
      const json = await res.json();
      bodyError = typeof json?.error === "string" ? json.error : undefined;
    } catch {
      // ignore parse errors
    }
    return { ok: false, error: bodyError ?? "Upload failed." };
  }

  const json = await res.json();
  return { ok: true, id: json.id as string };
}
