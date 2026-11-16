import type { Prisma } from "@/generated/prisma/client";
import { computeVerificationStatus, REQUIRED_DOCS } from "@/lib/verification";

export async function recomputeRenteeStatus(
  tx: Prisma.TransactionClient,
  renteeID: string
): Promise<void> {
  const docs = await tx.document.findMany({
    where: { renteeID },
    select: { type: true, verificationStatus: true, createdAt: true },
  });
  const newStatus = computeVerificationStatus(
    docs.map((d) => ({ type: d.type, status: d.verificationStatus, createdAt: d.createdAt })),
    REQUIRED_DOCS.customer
  );
  await tx.rentee.update({ where: { renteeID }, data: { verificationStatus: newStatus } });
}

export async function recomputeRenterStatus(
  tx: Prisma.TransactionClient,
  renterID: string
): Promise<void> {
  const docs = await tx.document.findMany({
    where: { renterID },
    select: { type: true, verificationStatus: true, createdAt: true },
  });
  const newStatus = computeVerificationStatus(
    docs.map((d) => ({ type: d.type, status: d.verificationStatus, createdAt: d.createdAt })),
    REQUIRED_DOCS.owner
  );
  await tx.renter.update({ where: { renterID }, data: { verificationStatus: newStatus } });
}
