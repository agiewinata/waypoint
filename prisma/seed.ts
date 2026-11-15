import "dotenv/config";
import { db } from "@/lib/db";
import { createCredentialUser, ensureAdmin } from "@/server/provision-user";
import { encryptFile, decryptFile } from "@/lib/crypto/file-encryption";
import { assertDocumentHasExactlyOneParent } from "@/lib/validation/document";
import { assertVehiclePriceValid } from "@/lib/validation/vehicle";

// ---------------------------------------------------------------------------
// Date helpers (inlined — src/lib/dates.ts is created in a later task)
// ---------------------------------------------------------------------------

function todaySeed(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

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
    ? await db.user.findUnique({
        where: { email: adminEmail },
        select: { id: true },
      })
    : null;
  const allSeedIds = adminUser
    ? [...seedUserIds, adminUser.id]
    : seedUserIds;

  // Children first (Notification must come before User cascade)
  await db.notification.deleteMany({});
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
    while (seedPassword.length < 10) {
      seedPassword += "0";
    }
    console.log("Generated SEED_USER_PASSWORD:", seedPassword);
  }

  // 1. Wipe
  await wipeOwnedTables();

  // 2. Create credential users
  // User 1: Owner-only (Renter profile, no Rentee)
  const ownerUser = await createCredentialUser({
    email: "owner1@seed.waypoint.local",
    name: "Owner One",
    password: seedPassword,
  });

  // User 2: Customer-only (Rentee profile, verificationStatus: Verified)
  const customerUser = await createCredentialUser({
    email: "customer1@seed.waypoint.local",
    name: "Customer One",
    password: seedPassword,
  });

  // User 3: Dual-role (both Renter and Rentee)
  const bothUser = await createCredentialUser({
    email: "both1@seed.waypoint.local",
    name: "Both User",
    password: seedPassword,
  });

  // User 4: Admin
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

  // 3. Renter profiles
  // User 1 — Owner-only
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

  // User 3 — Dual-role renter side
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

  // User 5 — Renter with userID = null (no linked User account; exercises nullability)
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

  // 4. Rentee profiles
  // User 2 — Customer-only, Verified
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

  // User 3 — Dual-role rentee side, Pending KTP
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

  // 5. Admin profile
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

  // 6. Vehicles — ≥6 Approved across ≥4 cities, 1 Pending
  const dummy = Buffer.from("DUMMY_DOC_DATA_FOR_SEED");

  // Helper to create an encrypted document
  async function createVehicleDoc(
    vehicleVIN: string,
    type: "STNK" | "Insurance",
    status: "Verified" | "Pending"
  ) {
    const enc = encryptFile(dummy);
    assertDocumentHasExactlyOneParent({ vehicleVIN });
    await db.document.create({
      data: {
        vehicleVIN,
        type,
        verificationStatus: status,
        verifiedAt: status === "Verified" ? new Date() : undefined,
        fileData: new Uint8Array(enc.fileData),
        iv: enc.iv,
        authTag: enc.authTag,
      },
    });
  }

  // --- Approved vehicles (renter1 owns v1–v4, renter2 owns v5–v6) ---

  // v1: Toyota Avanza — Jakarta — MPV
  const v1 = await db.vehicle.create({
    data: {
      VIN: "JT2BF22K1W0123456",
      renterID: renter1.renterID,
      listingCode: "WP-AVZ001",
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
  await createVehicleDoc(v1.VIN, "STNK", "Verified");
  await createVehicleDoc(v1.VIN, "Insurance", "Verified");

  // v2: Honda Jazz — Bandung — Hatchback
  const v2 = await db.vehicle.create({
    data: {
      VIN: "1HGBH41J5MN109001",
      renterID: renter1.renterID,
      listingCode: "WP-JZZ001",
      make: "Honda",
      model: "Jazz",
      year: 2021,
      plateNumber: "D 1234 SEA",
      type: "Hatchback",
      city: "Bandung",
      pricePerDay: 250000,
      status: "Approved",
    },
  });
  assertVehiclePriceValid({ status: "Approved", pricePerDay: 250000 });
  await createVehicleDoc(v2.VIN, "STNK", "Verified");
  await createVehicleDoc(v2.VIN, "Insurance", "Verified");

  // v3: Toyota Innova — Surabaya — MPV (used for active booking)
  const v3 = await db.vehicle.create({
    data: {
      VIN: "MHKW983GPCK000001",
      renterID: renter1.renterID,
      listingCode: "WP-INV001",
      make: "Toyota",
      model: "Innova",
      year: 2023,
      plateNumber: "L 1234 SEA",
      type: "MPV",
      city: "Surabaya",
      pricePerDay: 400000,
      status: "Approved",
    },
  });
  assertVehiclePriceValid({ status: "Approved", pricePerDay: 400000 });
  await createVehicleDoc(v3.VIN, "STNK", "Verified");
  await createVehicleDoc(v3.VIN, "Insurance", "Verified");

  // v4: Honda CR-V — Yogyakarta — SUV (used for completed booking)
  const v4 = await db.vehicle.create({
    data: {
      VIN: "2HGES16503H523472",
      renterID: renter1.renterID,
      listingCode: "WP-CRV001",
      make: "Honda",
      model: "CR-V",
      year: 2022,
      plateNumber: "AB 1234 SEA",
      type: "SUV",
      city: "Yogyakarta",
      pricePerDay: 500000,
      status: "Approved",
    },
  });
  assertVehiclePriceValid({ status: "Approved", pricePerDay: 500000 });
  await createVehicleDoc(v4.VIN, "STNK", "Verified");
  await createVehicleDoc(v4.VIN, "Insurance", "Verified");

  // v5: Toyota Camry — Bali — Sedan
  const v5 = await db.vehicle.create({
    data: {
      VIN: "1G1JC524657171001",
      renterID: renter2.renterID,
      listingCode: "WP-CAM001",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      plateNumber: "DK 1234 SEA",
      type: "Sedan",
      city: "Bali",
      pricePerDay: 600000,
      status: "Approved",
    },
  });
  assertVehiclePriceValid({ status: "Approved", pricePerDay: 600000 });
  await createVehicleDoc(v5.VIN, "STNK", "Verified");
  await createVehicleDoc(v5.VIN, "Insurance", "Verified");

  // v6: Daihatsu Sigra — Jakarta — MPV
  const v6 = await db.vehicle.create({
    data: {
      VIN: "MHK4T3GG7FM000002",
      renterID: renter2.renterID,
      listingCode: "WP-SGR001",
      make: "Daihatsu",
      model: "Sigra",
      year: 2023,
      plateNumber: "B 2222 SEA",
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 220000,
      status: "Approved",
    },
  });
  assertVehiclePriceValid({ status: "Approved", pricePerDay: 220000 });
  await createVehicleDoc(v6.VIN, "STNK", "Verified");
  await createVehicleDoc(v6.VIN, "Insurance", "Verified");

  // v7: Hyundai i20 — Bandung — Hatchback — Pending
  const v7 = await db.vehicle.create({
    data: {
      VIN: "KMHDN46D12U123456",
      renterID: renter2.renterID,
      listingCode: "WP-I20001",
      make: "Hyundai",
      model: "i20",
      year: 2023,
      plateNumber: "D 5678 SEB",
      type: "Hatchback",
      city: "Bandung",
      pricePerDay: 0,
      status: "Pending",
    },
  });
  // Pending vehicle — price 0 is acceptable for non-Approved status
  await createVehicleDoc(v7.VIN, "STNK", "Pending");
  await createVehicleDoc(v7.VIN, "Insurance", "Pending");

  // Keep v7 reference alive (suppress unused-var warning)
  void v7;

  // 7. Customer (User 2 / rentee1) identity documents — KTP + SIM, both Verified
  const ktpEnc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ renteeID: rentee1.renteeID });
  const ktpDoc = await db.document.create({
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

  const simEnc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ renteeID: rentee1.renteeID });
  await db.document.create({
    data: {
      renteeID: rentee1.renteeID,
      type: "SIM",
      verificationStatus: "Verified",
      verifiedAt: new Date(),
      fileData: new Uint8Array(simEnc.fileData),
      iv: simEnc.iv,
      authTag: simEnc.authTag,
    },
  });

  // User 3 (rentee2) — one Pending KTP
  const ktp2Enc = encryptFile(dummy);
  assertDocumentHasExactlyOneParent({ renteeID: rentee2.renteeID });
  await db.document.create({
    data: {
      renteeID: rentee2.renteeID,
      type: "KTP",
      verificationStatus: "Pending",
      fileData: new Uint8Array(ktp2Enc.fileData),
      iv: ktp2Enc.iv,
      authTag: ktp2Enc.authTag,
    },
  });

  // 8. Bookings (using relative dates from todaySeed())
  const today = todaySeed();

  // Booking 1: Pending — rentee1, v1 (Avanza), today+5 to today+8
  const bPending = await db.booking.create({
    data: {
      vehicleVIN: v1.VIN,
      renteeID: rentee1.renteeID,
      startDate: addDays(today, 5),
      endDate: addDays(today, 8),
      status: "Pending",
      totalPrice: 900000, // 3 days × 300000
    },
  });

  // Booking 2: Confirmed — rentee2, v2 (Jazz), today+10 to today+13
  const bConfirmed = await db.booking.create({
    data: {
      vehicleVIN: v2.VIN,
      renteeID: rentee2.renteeID,
      startDate: addDays(today, 10),
      endDate: addDays(today, 13),
      status: "Confirmed",
      totalPrice: 750000, // 3 days × 250000
    },
  });

  // Keep bConfirmed reference (suppress unused-var warning)
  void bConfirmed;

  // Booking 3: Active — rentee1, v3 (Innova), today-1 to today+2
  //   locationConsentAt: now (customer consented to location tracking)
  const bActive = await db.booking.create({
    data: {
      vehicleVIN: v3.VIN,
      renteeID: rentee1.renteeID,
      startDate: addDays(today, -1),
      endDate: addDays(today, 2),
      status: "Active",
      totalPrice: 1200000, // 3 days × 400000
      locationConsentAt: new Date(),
    },
  });

  // Booking 4: Completed — rentee1, v4 (CR-V), today-10 to today-7
  const bCompleted = await db.booking.create({
    data: {
      vehicleVIN: v4.VIN,
      renteeID: rentee1.renteeID,
      startDate: addDays(today, -10),
      endDate: addDays(today, -7),
      status: "Completed",
      totalPrice: 1500000, // 3 days × 500000
    },
  });

  // Suppress unused-var for bPending (it's referenced in notifications below)
  void bPending;

  // 9. Payments
  // Active booking — Held
  await db.payment.create({
    data: {
      bookingID: bActive.bookingID,
      amount: 1200000,
      method: "simulated",
      status: "Held",
      paidAt: addDays(today, -2),
    },
  });

  // Completed booking — Released
  await db.payment.create({
    data: {
      bookingID: bCompleted.bookingID,
      amount: 1500000,
      method: "simulated",
      status: "Released",
      paidAt: addDays(today, -11),
      escrowReleaseDate: addDays(today, -6),
    },
  });

  // 10. LocationLogs for the active booking (Jakarta-area coordinates)
  const locationData = [
    { lat: -6.2088, lng: 106.8456, accuracy: 10.5, speed: 0 },
    { lat: -6.21, lng: 106.847, accuracy: 8.0, speed: 25.3 },
    { lat: -6.215, lng: 106.85, accuracy: 12.0, speed: 40.1 },
  ];
  for (const loc of locationData) {
    await db.locationLog.create({
      data: {
        bookingID: bActive.bookingID,
        renteeID: rentee1.renteeID,
        latitude: loc.lat,
        longitude: loc.lng,
        accuracy: loc.accuracy,
        recordedAt: new Date(),
        speedKph: loc.speed,
      },
    });
  }

  // 11. Disputes
  // Open dispute on the active booking (raised by customer)
  await db.dispute.create({
    data: {
      bookingID: bActive.bookingID,
      raisedBy: "Rentee",
      description: "Vehicle condition does not match the listing description.",
      status: "Open",
    },
  });

  // Resolved dispute on the completed booking (raised by owner, resolved by admin)
  await db.dispute.create({
    data: {
      bookingID: bCompleted.bookingID,
      raisedBy: "Renter",
      description: "Vehicle was returned with damage to the rear bumper.",
      status: "Resolved",
      resolvedByAdminID: adminProfile.adminID,
      resolvedAt: new Date(),
    },
  });

  // 12. Notifications — ≥2 per user
  // Owner (renter1 / ownerUser)
  await db.notification.create({
    data: {
      userID: ownerUser.id,
      type: "BOOKING_REQUEST",
      title: "New booking request",
      body: "A customer has requested to rent your Toyota Avanza (Jakarta) from " +
        addDays(today, 5).toLocaleDateString("id-ID") + ".",
      href: "/dashboard/bookings",
    },
  });
  await db.notification.create({
    data: {
      userID: ownerUser.id,
      type: "RENTAL_ACTIVE",
      title: "Rental is now active",
      body: "The rental of your Toyota Innova (Surabaya) has started. Location tracking is enabled.",
      href: "/dashboard/bookings",
    },
  });

  // Customer (rentee1 / customerUser)
  await db.notification.create({
    data: {
      userID: customerUser.id,
      type: "BOOKING_CONFIRMED",
      title: "Booking confirmed",
      body: "Your Honda CR-V booking has been confirmed. Have a great trip!",
      href: "/dashboard/bookings",
    },
  });
  await db.notification.create({
    data: {
      userID: customerUser.id,
      type: "RENTAL_ACTIVE",
      title: "Your rental has started",
      body: "Your Toyota Innova rental is now active. Drive safely!",
      href: "/dashboard/bookings",
    },
  });

  // Both user (rentee2 / bothUser)
  await db.notification.create({
    data: {
      userID: bothUser.id,
      type: "BOOKING_CONFIRMED",
      title: "Booking confirmed",
      body: "Your Honda Jazz booking has been confirmed. Pickup on " +
        addDays(today, 10).toLocaleDateString("id-ID") + ".",
      href: "/dashboard/bookings",
    },
  });
  await db.notification.create({
    data: {
      userID: bothUser.id,
      type: "PROFILE_REVIEW",
      title: "Profile under review",
      body: "Your owner profile is being reviewed by our team. We will notify you once completed.",
      href: "/dashboard/profile",
    },
  });

  // Admin
  await db.notification.create({
    data: {
      userID: adminUser.id,
      type: "VEHICLE_SUBMISSION",
      title: "New vehicle submission",
      body: "Hyundai i20 (Bandung) has been submitted for review by Both User.",
      href: "/admin/vehicles",
    },
  });
  await db.notification.create({
    data: {
      userID: adminUser.id,
      type: "VERIFICATION_REQUEST",
      title: "New verification request",
      body: "Both User has submitted identity documents for verification.",
      href: "/admin/verifications",
    },
  });

  // 13. Crypto round-trip verification
  const fetchedKtp = await db.document.findUnique({
    where: { documentID: ktpDoc.documentID },
  });
  if (!fetchedKtp) throw new Error("KTP document not found after seeding");
  const decrypted = decryptFile({
    fileData: Buffer.from(fetchedKtp.fileData),
    iv: fetchedKtp.iv,
    authTag: fetchedKtp.authTag,
  });
  const decryptedText = decrypted.toString();
  if (decryptedText !== "DUMMY_DOC_DATA_FOR_SEED") {
    throw new Error(
      `KTP document decryption produced unexpected result: "${decryptedText}"`
    );
  }
  console.log("KTP decrypts correctly to:", decryptedText);

  // 14. Print row counts
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
    db.notification.count(),
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
    notification: counts[10],
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
