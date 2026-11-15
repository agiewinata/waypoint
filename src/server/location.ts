import { db } from "@/lib/db";
import { HttpError } from "@/server/http";
import { todayJakarta } from "@/lib/dates";
import type { LocationCreateInputType } from "@/lib/validation/location";

// ---------------------------------------------------------------------------
// DTOs — no Prisma models leave this module
// ---------------------------------------------------------------------------

export interface LocationPointDTO {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedKph: number | null;
  recordedAt: string;
}

export interface TrackingDTO {
  points: LocationPointDTO[];
  lastSeenAt: string | null;
  overdue: boolean;
}

// ---------------------------------------------------------------------------
// L1: record a GPS location point for an active booking
// ---------------------------------------------------------------------------

export async function recordLocation(
  renteeID: string,
  input: LocationCreateInputType
): Promise<{ id: string; overdue: boolean }> {
  const booking = await db.booking.findFirst({
    where: { bookingID: input.bookingId, renteeID },
    select: {
      bookingID: true,
      status: true,
      locationConsentAt: true,
      endDate: true,
    },
  });

  if (!booking) throw new HttpError(404, "Booking not found");

  if (booking.status !== "Active") {
    throw new HttpError(409, "Booking is not active");
  }

  if (!booking.locationConsentAt) {
    throw new HttpError(409, "Location consent has not been given for this booking");
  }

  // Rate limit: at most one location update per 10 seconds per booking.
  const tenSecondsAgo = new Date(Date.now() - 10_000);
  const lastLog = await db.locationLog.findFirst({
    where: { bookingID: input.bookingId },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  if (lastLog && lastLog.recordedAt > tenSecondsAgo) {
    throw new HttpError(
      429,
      "Too many requests: wait at least 10 seconds between location updates"
    );
  }

  const now = new Date();

  const log = await db.$transaction(async (tx) => {
    const created = await tx.locationLog.create({
      data: {
        bookingID: input.bookingId,
        renteeID,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        speedKph: input.speedKph ?? null,
        recordedAt: now,
      },
    });

    // Keep the Rentee's last known position in sync for quick lookups.
    await tx.rentee.update({
      where: { renteeID },
      data: {
        lastKnownLat: input.latitude,
        lastKnownLng: input.longitude,
        lastSeenAt: now,
      },
    });

    return created;
  });

  const overdue = booking.endDate < todayJakarta();
  return { id: log.logID, overdue };
}

// ---------------------------------------------------------------------------
// L2: get the latest tracking points for a booking (owner view)
// ---------------------------------------------------------------------------

export async function getTrackingForOwner(
  renterID: string,
  bookingId: string
): Promise<TrackingDTO | null> {
  const booking = await db.booking.findFirst({
    where: {
      bookingID: bookingId,
      vehicle: { renterID },
    },
    select: {
      status: true,
      endDate: true,
      rentee: { select: { lastSeenAt: true } },
    },
  });

  if (!booking) return null;

  const logs = await db.locationLog.findMany({
    where: { bookingID: bookingId },
    orderBy: { recordedAt: "desc" },
    take: 20,
    select: {
      logID: true,
      latitude: true,
      longitude: true,
      accuracy: true,
      speedKph: true,
      recordedAt: true,
    },
  });

  const points: LocationPointDTO[] = logs.map((l) => ({
    id: l.logID,
    latitude: Number(l.latitude),
    longitude: Number(l.longitude),
    accuracy: l.accuracy !== null ? Number(l.accuracy) : null,
    speedKph: l.speedKph !== null ? Number(l.speedKph) : null,
    recordedAt: l.recordedAt.toISOString(),
  }));

  const overdue =
    booking.status === "Active" && booking.endDate < todayJakarta();

  return {
    points,
    lastSeenAt: booking.rentee.lastSeenAt?.toISOString() ?? null,
    overdue,
  };
}
