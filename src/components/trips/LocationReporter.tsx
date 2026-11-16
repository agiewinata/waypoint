"use client";

import { useEffect, useRef, useState } from "react";

interface LocationReporterProps {
  bookingId: string;
}

type ReporterStatus = "idle" | "sharing" | "denied" | "off";

/**
 * Client component that watches the user's GPS position and POSTs updates to
 * /api/location at most once every 15 seconds.  Stops automatically on a 409
 * response (booking no longer active).
 */
export function LocationReporter({ bookingId }: LocationReporterProps) {
  const [status, setStatus] = useState<ReporterStatus>("idle");
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  // Ref so the async sendLocation callback always reads the latest value
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("off");
      return;
    }

    function clearWatch() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    async function sendLocation(
      lat: number,
      lng: number,
      accuracy: number,
      speedMs: number | null
    ) {
      if (stoppedRef.current) return;

      const now = Date.now();
      // Client-side 15-second rate limit
      if (now - lastSentRef.current < 15_000) return;
      lastSentRef.current = now;

      try {
        const res = await fetch("/api/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: window.location.origin,
          },
          body: JSON.stringify({
            bookingId,
            latitude: lat,
            longitude: lng,
            accuracy,
            speedKph: speedMs !== null ? speedMs * 3.6 : undefined,
          }),
        });

        if (res.status === 409) {
          // Booking is no longer active — stop watching
          stoppedRef.current = true;
          clearWatch();
          setStatus("off");
        }
      } catch {
        // Silently ignore transient network errors; next position update will retry
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("sharing");
        void sendLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.coords.speed
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setStatus("off");
        }
        clearWatch();
      },
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );

    return () => {
      clearWatch();
    };
  }, [bookingId]);

  if (status === "idle") return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
      }}
    >
      {status === "sharing" && (
        <>
          <span
            className="dot animate-pulse-dot"
            style={{ background: "var(--ok)" }}
            aria-hidden="true"
          />
          <span style={{ color: "var(--ok)" }}>Sharing location</span>
        </>
      )}
      {status === "denied" && (
        <>
          <span
            className="dot"
            style={{ background: "var(--alert)" }}
            aria-hidden="true"
          />
          <span style={{ color: "var(--alert)" }}>Permission denied</span>
        </>
      )}
      {status === "off" && (
        <>
          <span
            className="dot"
            style={{ background: "var(--done)" }}
            aria-hidden="true"
          />
          <span style={{ color: "var(--done)" }}>Location off</span>
        </>
      )}
    </span>
  );
}
