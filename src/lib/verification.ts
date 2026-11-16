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

  // If any required type has no doc → Unverified
  for (const type of required) {
    if (!latestByType.has(type)) return "Unverified";
  }

  // All required types have latest docs; check their statuses
  if (required.every((type) => latestByType.get(type)!.status === "Verified")) return "Verified";
  if (required.some((type) => latestByType.get(type)!.status === "Rejected")) return "Rejected";
  return "Pending";
}
