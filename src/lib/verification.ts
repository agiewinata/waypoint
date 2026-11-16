import type { DocumentType, VerificationStatus } from "@/generated/prisma/client";

export const REQUIRED_DOCS = {
  customer: ["KTP", "SIM"] as const satisfies DocumentType[],
  owner: ["KTP", "SIM", "BPKB"] as const satisfies DocumentType[],
} as const;

export function computeVerificationStatus(
  docs: { type: DocumentType; status: VerificationStatus; createdAt: Date }[],
  required: readonly DocumentType[],
): VerificationStatus {
  // For each required type, pick the newest doc (by createdAt).
  const latestByType = new Map<DocumentType, { status: VerificationStatus; createdAt: Date }>();
  for (const doc of docs) {
    const existing = latestByType.get(doc.type);
    if (!existing || doc.createdAt > existing.createdAt) {
      latestByType.set(doc.type, { status: doc.status, createdAt: doc.createdAt });
    }
  }

  // All required types have a Verified doc → Verified
  if (required.every((type) => latestByType.get(type)?.status === "Verified")) return "Verified";

  // Any required type's latest doc is Rejected → Rejected
  if (required.some((type) => latestByType.get(type)?.status === "Rejected")) return "Rejected";

  // At least one required type has any doc → Pending
  if (required.some((type) => latestByType.has(type))) return "Pending";

  // No required type has any doc → Unverified
  return "Unverified";
}
