"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { StatusTag } from "./StatusTag";

interface VehicleCardProps {
  id: string;
  listingCode: string;
  make: string;
  model: string;
  year: number;
  type: string;
  city: string;
  pricePerDay: number;
  status?: string;
  showStatus?: boolean;
}

export function VehicleCard({
  id,
  listingCode,
  make,
  model,
  year,
  type,
  city,
  pricePerDay,
  status,
  showStatus = false,
}: VehicleCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <Link
        href={`/vehicles/${id}`}
        className="card row-hover block no-underline"
        style={{ overflow: "hidden" }}
      >
        {/* Photo placeholder */}
        <div
          className="photo-placeholder"
          style={{ height: 160, position: "relative" }}
        >
          <Icon
            icon="ph:car"
            width={48}
            style={{ color: "var(--slate)", opacity: 0.4 }}
            aria-hidden="true"
          />
          {/* listing code badge */}
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              background: "var(--paper)",
              color: "var(--slate)",
              padding: "2px 6px",
              border: "1px solid var(--line)",
            }}
          >
            {listingCode}
          </span>
          {showStatus && status && (
            <span style={{ position: "absolute", top: 10, right: 10 }}>
              <StatusTag status={status} />
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "14px 16px" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              marginBottom: 2,
            }}
          >
            {year} {make} {model}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
            }}
          >
            <span className="kicker" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon icon="ph:map-pin" width={11} aria-hidden="true" />
              {city}
            </span>
            <span className="kicker">{type}</span>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              RP {pricePerDay.toLocaleString("id-ID")}
            </span>
            <span className="kicker" style={{ marginLeft: 4 }}>/ day</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
