"use client";

import type { LocationPointDTO } from "@/server/location";
import { formatDate } from "@/lib/format";

interface TrackingMapProps {
  points: LocationPointDTO[];
  lastSeenAt: string | null;
  overdue: boolean;
}

const MAP_W = 600;
const MAP_H = 400;

/** Maps a longitude (-180..180) to an SVG x-coordinate. */
function lngToX(lng: number): number {
  return ((lng + 180) / 360) * MAP_W;
}

/** Maps a latitude (90..-90) to an SVG y-coordinate (SVG y-axis is flipped). */
function latToY(lat: number): number {
  return ((90 - lat) / 180) * MAP_H;
}

/**
 * Client component that renders real GPS location points on an SVG map.
 * Points are ordered newest-first (the first element is the latest position).
 */
export function TrackingMap({ points, lastSeenAt, overdue }: TrackingMapProps) {
  // points[0] is the most recent (orderBy recordedAt desc)
  const latest = points[0] ?? null;
  const latestColor = overdue ? "var(--alert)" : "var(--accent)";

  if (points.length === 0) {
    return (
      <div
        style={{
          border: "1px solid var(--line)",
          marginBottom: 24,
          height: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "var(--thumb)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--slate)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          No location data yet
        </span>
        {lastSeenAt && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--slate)",
            }}
          >
            Last seen: {formatDate(lastSeenAt)}
          </span>
        )}
      </div>
    );
  }

  const latestX = lngToX(latest!.longitude);
  const latestY = latToY(latest!.latitude);

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
        background: "var(--thumb)",
      }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        style={{ display: "block" }}
        aria-label="Live location map"
        role="img"
      >
        {/* Background */}
        <rect width={MAP_W} height={MAP_H} fill="var(--thumb)" />

        {/* Road grid */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={50 * i + 5}
            x2={MAP_W}
            y2={50 * i + 5}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <line
            key={`v${i}`}
            x1={50 * i + 5}
            y1={0}
            x2={50 * i + 5}
            y2={MAP_H}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
        ))}

        {/* Major roads */}
        <line
          x1={0}
          y1={MAP_H / 2}
          x2={MAP_W}
          y2={MAP_H / 2}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="3"
        />
        <line
          x1={MAP_W / 2}
          y1={0}
          x2={MAP_W / 2}
          y2={MAP_H}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="3"
        />

        {/* Older trail points */}
        {points.slice(1).map((pt) => (
          <circle
            key={pt.id}
            cx={lngToX(pt.longitude)}
            cy={latToY(pt.latitude)}
            r={4}
            fill="var(--accent)"
            opacity={0.4}
          />
        ))}

        {/* Latest point — larger marker, overdue = alert colour */}
        <rect
          x={latestX - 6}
          y={latestY - 6}
          width={12}
          height={12}
          fill={latestColor}
        />
        <rect
          x={latestX - 8}
          y={latestY - 8}
          width={16}
          height={16}
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />

        {/* Speed label */}
        {latest!.speedKph !== null && (
          <>
            <rect
              x={latestX + 10}
              y={latestY - 18}
              width={56}
              height={16}
              fill="var(--paper)"
            />
            <text
              x={latestX + 13}
              y={latestY - 6}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fill: "var(--ink)",
              }}
            >
              {latest!.speedKph.toFixed(0)} km/h
            </text>
          </>
        )}
      </svg>

      {/* Coordinate overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--slate)",
          letterSpacing: "0.06em",
          background: "rgba(245,243,237,0.9)",
          padding: "3px 7px",
        }}
      >
        {latest!.latitude.toFixed(5)}, {latest!.longitude.toFixed(5)}
        {latest!.accuracy !== null && ` · ±${latest!.accuracy.toFixed(0)}m`}
      </div>

      {/* Last seen / status overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: overdue ? "var(--alert)" : "var(--ok)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "rgba(245,243,237,0.9)",
          padding: "3px 7px",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {!overdue && (
          <span
            className="dot animate-pulse-dot"
            style={{
              background: "var(--ok)",
              width: 6,
              height: 6,
              display: "inline-block",
            }}
          />
        )}
        {lastSeenAt ? `Last seen: ${formatDate(lastSeenAt)}` : "Live"}
      </div>
    </div>
  );
}
