export interface DocumentParentInput {
  vehicleVIN?: string | null;
  renterID?: string | null;
  renteeID?: string | null;
}

export function assertDocumentHasExactlyOneParent(
  input: DocumentParentInput
): void {
  const count = [input.vehicleVIN, input.renterID, input.renteeID].filter(
    (v) => v != null && v !== ""
  ).length;
  if (count !== 1) {
    throw new Error(
      `Document must have exactly one parent (vehicleVIN, renterID, or renteeID), got ${count}`
    );
  }
}
