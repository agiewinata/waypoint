import "dotenv/config";
import { db } from "@/lib/db";
import { createCredentialUser, ensureAdmin } from "@/server/provision-user";
import { encryptFile, decryptFile } from "@/lib/crypto/file-encryption";
import { assertDocumentHasExactlyOneParent } from "@/lib/validation/document";
import { assertVehiclePriceValid } from "@/lib/validation/vehicle";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random 12-char alphanumeric password as a fallback. */
function randomPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// 1. Wipe owned tables in FK-safe order (children before parents)
// ---------------------------------------------------------------------------

async function wipeOwnedTables(): Promise<void> {
  // Collect seed user IDs before wiping owned tables so we can target them
  const seedUsers = await db.user.findMany({
    where: { email: { endsWith: "@seed.waypoint.local" } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map((u) => u.id);

  // Also find the admin user (it may have been created by an earlier seed run)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUser = adminEmail
    ? await db.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
    : null;
  const allSeedIds = adminUser
    ? [...seedUserIds, adminUser.id]
    : seedUserIds;

  // Children first
  await db.dispute.deleteMany({});
  await db.locationLog.deleteMany({});
  await db.payment.deleteMany({});
  await db.booking.deleteMany({});
  await db.document.deleteMany({});
  await db.vehicle.deleteMany({});
  await db.admin.deleteMany({});
  await db.rentee.deleteMany({});
  await db.renter.deleteMany({});

  // Now wipe auth rows created by previous seed runs
  if (allSeedIds.length > 0) {
    await db.account.deleteMany({ where: { userId: { in: allSeedIds } } });
    await db.user.deleteMany({ where: { id: { in: allSeedIds } } });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Determine seed password
  let seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword || seedPassword.length < 10) {
    seedPassword = randomPassword();
    // Ensure at least 10 chars (randomPassword generates 12, but guard anyway)
    while (seedPassword.length < 10) {
      seedPassword += "0";
    }
    console.log("Generated SEED_USER_PASSWORD:", seedPassword);
  }

  // 1. Wipe
  await wipeOwnedTables();

  // 2. Create 4 credential users
  const ownerUser = await createCredentialUser({
    email: "owner1@seed.waypoint.local",
    name: "Owner One",
    password: seedPassword,
  });

  const customerUser = await createCredentialUser({
    email: "customer1@seed.waypoint.local",
    name: "Customer One",
    password: seedPassword,
  });

  const bothUser = await createCredentialUser({
    email: "both1@seed.waypoint.local",
    name: "Both User",
    password: seedPassword,
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminName || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD must be set in .env"
    );
  }

  const adminUser = await createCredentialUser({
    email: adminEmail,
    name: adminName,
    password: adminPassword,
  });

  // 3. Create Renter profiles
  const renter1 = await db.renter.create({
    data: {
      userID: ownerUser.id,
      name: "Owner One",
      email: "owner1@seed.waypoint.local",
      phone: "+62811000001",
      address: "Jl. Sudirman No. 1, Jakarta",
      verificationStatus: "Verified",
    },
  });

  const renter2 = await db.renter.create({
    data: {
      userID: bothUser.id,
      name: "Both User",
      email: "both1@seed.waypoint.local",
      phone: "+62811000003",
      address: "Jl. Gatot Subroto No. 3, Jakarta",
      verificationStatus: "Pending",
    },
  });

  // renterOrphan — userID: null, exercises nullability
  await db.renter.create({
    data: {
      userID: null,
      name: "Orphan Renter",
      email: "orphan@seed.waypoint.local",
      phone: "+62811000099",
      address: "Jl. Orphan No. 99, Jakarta",
      verificationStatus: "Unverified",
    },
  });

  // 4. Create Rentee profiles
  const rentee1 = await db.rentee.create({
    data: {
      userID: customerUser.id,
      name: "Customer One",
      email: "customer1@seed.waypoint.local",
      phone: "+62822000001",
      address: "Jl. Thamrin No. 1, Jakarta",
      verificationStatus: "Verified",
    },
  });

  const rentee2 = await db.rentee.create({
    data: {
      userID: bothUser.id,
      name: "Both User",
      email: "both1@seed.waypoint.local",
      phone: "+62822000003",
      address: "Jl. Gatot Subroto No. 3, Jakarta",
      verificationStatus: "Pending",
    },
  });

  // 5. Create Admin profile
  await ensureAdmin({
    userId: adminUser.id,
    name: adminName,
    email: adminEmail,
    permission: "full",
  });

  const adminProfile = await db.admin.findUnique({
    where: { userID: adminUser.id },
  });
  if (!adminProfile) throw new Error("Admin profile not found after ensureAdmin");

  // 6. Create 3 Vehicles
  const v1 = await db.vehicle.create({
    data: {
      VIN: "JT2BF22K1W0123456",
      renterID: renter1.renterID,
      listingCode: "SEED-AVZ-001",
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber: "B 1234 SEA",
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 300000,
      status: "Approved",
    },
  });
  assertVehiclePriceValid({ status: "Approved", pricePerDay: 300000 });

  const v2 = await db.vehicle.create({
    data: {
      VIN: "KMHDN46D12U123456",
      renterID: renter2.renterID,
      listingCode: "SEED-I20-001",
      make: "Hyundai",
      model: "i20",
      year: 2023,
      plateNumber: "D 5678 SEB",
      type: "Hatchback",
      city: "Bandung",
      pricePerDay: 250000,
      status: "Pending",
    },
  });

  await db.vehicle.create({
    data: {
      VIN: "1HGBH41JXMN109186",
      renterID: renter1.renterID,
      listingCode: "SEED-CB150-001",
      make: "Honda",
      model: "CB150",
      year: 2021,
      plateNumber: "F 9012 SEC",
      type: "Motorcycle",
      city: "Surabaya",
      pricePerDay: 0,
      status: "Draft",
    },
  });
  // Draft with price 0 is valid — assertVehiclePriceValid would pass (non-Approved)

  // 7. Create 4 Documents (one of each DocumentType), encrypted
  const dummy = Buffer.from("SEED_DOCUMENT_PLACEHOLDER");

  // STNK — belongs to Vehicle v1
  const stnkEnc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ vehicleVIN: v1.VIN });
  await db.document.create({
    data: {
      vehicleVIN: v1.VIN,
      type: "STNK",
      verificationStatus: "Verified",
      verifiedAt: new Date(),
      fileData: new Uint8Array(stnkEnc.fileData),
      iv: stnkEnc.iv,
      authTag: stnkEnc.authTag,
    },
  });

  // Insurance — belongs to Vehicle v2
  const insEnc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ vehicleVIN: v2.VIN });
  await db.document.create({
    data: {
      vehicleVIN: v2.VIN,
      type: "Insurance",
      verificationStatus: "Pending",
      fileData: new Uint8Array(insEnc.fileData),
      iv: insEnc.iv,
      authTag: insEnc.authTag,
    },
  });

  // KTP — belongs to Rentee rentee1
  const ktpEnc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ renteeID: rentee1.renteeID });
  await db.document.create({
    data: {
      renteeID: rentee1.renteeID,
      type: "KTP",
      verificationStatus: "Verified",
      verifiedAt: new Date(),
      fileData: new Uint8Array(ktpEnc.fileData),
      iv: ktpEnc.iv,
      authTag: ktpEnc.authTag,
    },
  });

  // SIM — belongs to Renter renter1
  const simEnc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ renterID: renter1.renterID });
  await db.document.create({
    data: {
      renterID: renter1.renterID,
      type: "SIM",
      verificationStatus: "Unverified",
      fileData: new Uint8Array(simEnc.fileData),
      iv: simEnc.iv,
      authTag: simEnc.authTag,
    },
  });

  // 8. Create 3 Bookings
  const b1 = await db.booking.create({
    data: {
      vehicleVIN: v1.VIN,
      renteeID: rentee1.renteeID,
      startDate: new Date("2026-01-10"),
      endDate: new Date("2026-01-15"),
      status: "Pending",
      totalPrice: 1500000,
    },
  });

  const b2 = await db.booking.create({
    data: {
      vehicleVIN: v1.VIN,
      renteeID: rentee2.renteeID,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-03"),
      status: "Confirmed",
      totalPrice: 600000,
    },
  });

  const b3 = await db.booking.create({
    data: {
      vehicleVIN: v2.VIN,
      renteeID: rentee1.renteeID,
      startDate: new Date("2025-11-01"),
      endDate: new Date("2025-11-05"),
      status: "Completed",
      totalPrice: 1000000,
    },
  });

  // Keep b1 reference alive (used in counts; suppress unused-var warning)
  void b1;

  // 9. Create 2 Payments
  await db.payment.create({
    data: {
      bookingID: b2.bookingID,
      amount: 600000,
      method: "simulated",
      status: "Held",
      paidAt: new Date("2026-01-28"),
    },
  });

  await db.payment.create({
    data: {
      bookingID: b3.bookingID,
      amount: 950000,
      method: "simulated",
      status: "Released",
      paidAt: new Date("2025-11-01"),
      escrowReleaseDate: new Date("2025-11-06"),
    },
  });

  // 10. Create 3 LocationLogs (Jakarta-area coordinates)
  const locationData = [
    { lat: -6.2088, lng: 106.8456, accuracy: 10.5, speed: 0 },
    { lat: -6.21, lng: 106.847, accuracy: 8.0, speed: 25.3 },
    { lat: -6.215, lng: 106.85, accuracy: 12.0, speed: 40.1 },
  ];
  for (const loc of locationData) {
    await db.locationLog.create({
      data: {
        bookingID: b2.bookingID,
        renteeID: rentee2.renteeID,
        latitude: loc.lat,
        longitude: loc.lng,
        accuracy: loc.accuracy,
        recordedAt: new Date(),
        speedKph: loc.speed,
      },
    });
  }

  // 11. Create 2 Disputes
  await db.dispute.create({
    data: {
      bookingID: b3.bookingID,
      raisedBy: "Renter",
      description: "Vehicle was returned with damage to the front bumper.",
      status: "Open",
    },
  });

  await db.dispute.create({
    data: {
      bookingID: b2.bookingID,
      raisedBy: "Rentee",
      description: "Car was not in the agreed condition at pickup.",
      status: "Resolved",
      resolvedByAdminID: adminProfile.adminID,
      resolvedAt: new Date("2026-01-29"),
    },
  });

  // 12. Verification: decrypt a document to prove the crypto round-trip
  const ktpDoc = await db.document.findFirst({ where: { type: "KTP" } });
  if (!ktpDoc) throw new Error("KTP document not found after seeding");
  const decrypted = decryptFile({
    fileData: ktpDoc.fileData as Buffer,
    iv: ktpDoc.iv,
    authTag: ktpDoc.authTag,
  });
  const decryptedText = decrypted.toString();
  if (decryptedText !== "SEED_DOCUMENT_PLACEHOLDER") {
    throw new Error(
      `KTP document decryption produced unexpected result: "${decryptedText}"`
    );
  }
  console.log("KTP decrypts to:", decryptedText);

  // 13. Print counts
  const counts = await Promise.all([
    db.user.count(),
    db.renter.count(),
    db.rentee.count(),
    db.admin.count(),
    db.vehicle.count(),
    db.document.count(),
    db.booking.count(),
    db.payment.count(),
    db.locationLog.count(),
    db.dispute.count(),
  ]);
  console.log("Seeded rows:", {
    user: counts[0],
    renter: counts[1],
    rentee: counts[2],
    admin: counts[3],
    vehicle: counts[4],
    document: counts[5],
    booking: counts[6],
    payment: counts[7],
    locationLog: counts[8],
    dispute: counts[9],
  });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
