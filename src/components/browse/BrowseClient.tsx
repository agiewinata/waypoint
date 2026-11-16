"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { VehicleCard } from "@/components/ui/VehicleCard";
import type { PublicVehicle } from "@/server/vehicles";
import type { VehicleSearchQueryType } from "@/lib/validation/vehicle";

interface BrowseClientProps {
  initialItems: PublicVehicle[];
  initialQuery: VehicleSearchQueryType;
  total: number;
  cities: readonly string[];
  vehicleTypes: readonly string[];
}

/** Builds a query string from the given filter values, omitting empty/undefined entries. */
function buildUrl(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== 0) {
      params.set(k, String(v));
    }
  }
  const str = params.toString();
  return str ? `/?${str}` : "/";
}

export function BrowseClient({
  initialItems,
  initialQuery,
  total,
  cities,
  vehicleTypes,
}: BrowseClientProps) {
  const router = useRouter();

  // Local filter state — initialized from server-provided query
  const [city, setCity] = useState(initialQuery.city ?? "");
  const [type, setType] = useState(initialQuery.type ?? "");
  const [q, setQ] = useState(initialQuery.q ?? "");
  const [minPrice, setMinPrice] = useState(
    initialQuery.minPrice !== undefined ? String(initialQuery.minPrice) : ""
  );
  const [maxPrice, setMaxPrice] = useState(
    initialQuery.maxPrice !== undefined ? String(initialQuery.maxPrice) : ""
  );

  const page = initialQuery.page;
  const pageSize = initialQuery.pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // Ref to hold latest filter values for use in debounce effects
  const filterRef = useRef({ city, type, q, minPrice, maxPrice });
  useLayoutEffect(() => {
    filterRef.current = { city, type, q, minPrice, maxPrice };
  });

  /** Navigate to browse with updated filter params, resetting page to 1. */
  function navigate(overrides: Record<string, string | number | undefined>) {
    const { city: c, type: t, q: qv, minPrice: mn, maxPrice: mx } = filterRef.current;
    router.push(
      buildUrl({
        city: c || undefined,
        type: t || undefined,
        q: qv || undefined,
        minPrice: mn ? Number(mn) : undefined,
        maxPrice: mx ? Number(mx) : undefined,
        page: 1,
        ...overrides,
      })
    );
  }

  // Immediate navigation when select values change
  function handleCityChange(val: string) {
    setCity(val);
    router.push(
      buildUrl({
        city: val || undefined,
        type: filterRef.current.type || undefined,
        q: filterRef.current.q || undefined,
        minPrice: filterRef.current.minPrice ? Number(filterRef.current.minPrice) : undefined,
        maxPrice: filterRef.current.maxPrice ? Number(filterRef.current.maxPrice) : undefined,
        page: 1,
      })
    );
  }

  function handleTypeChange(val: string) {
    setType(val);
    router.push(
      buildUrl({
        city: filterRef.current.city || undefined,
        type: val || undefined,
        q: filterRef.current.q || undefined,
        minPrice: filterRef.current.minPrice ? Number(filterRef.current.minPrice) : undefined,
        maxPrice: filterRef.current.maxPrice ? Number(filterRef.current.maxPrice) : undefined,
        page: 1,
      })
    );
  }

  // Debounced navigation for text search
  useEffect(() => {
    const timer = setTimeout(() => {
      const { city: c, type: t, minPrice: mn, maxPrice: mx } = filterRef.current;
      router.push(
        buildUrl({
          city: c || undefined,
          type: t || undefined,
          q: q || undefined,
          minPrice: mn ? Number(mn) : undefined,
          maxPrice: mx ? Number(mx) : undefined,
          page: 1,
        })
      );
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Debounced navigation for price filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const { city: c, type: t, q: qv } = filterRef.current;
      router.push(
        buildUrl({
          city: c || undefined,
          type: t || undefined,
          q: qv || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          page: 1,
        })
      );
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice]);

  function handlePageChange(newPage: number) {
    const { city: c, type: t, q: qv, minPrice: mn, maxPrice: mx } = filterRef.current;
    router.push(
      buildUrl({
        city: c || undefined,
        type: t || undefined,
        q: qv || undefined,
        minPrice: mn ? Number(mn) : undefined,
        maxPrice: mx ? Number(mx) : undefined,
        page: newPage,
      })
    );
  }

  return (
    <>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 28,
          borderBottom: "1px solid var(--ink)",
          paddingBottom: 16,
        }}
      >
        <div>
          <span className="kicker" style={{ display: "block", marginBottom: 6 }}>
            {total} vehicle{total !== 1 ? "s" : ""} available
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
            }}
          >
            Browse cars
          </h2>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 32,
          alignItems: "center",
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Icon
            icon="ph:magnifying-glass"
            width={15}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--slate)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search make, model…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            style={{ paddingLeft: 32 }}
            aria-label="Search vehicles"
          />
        </div>

        {/* City filter */}
        <select
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          className="input select"
          style={{ flex: "0 1 160px" }}
          aria-label="Filter by city"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="input select"
          style={{ flex: "0 1 160px" }}
          aria-label="Filter by vehicle type"
        >
          <option value="">All types</option>
          {vehicleTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Min price */}
        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="input"
          style={{ flex: "0 1 120px" }}
          min={0}
          aria-label="Minimum price per day"
        />

        {/* Max price */}
        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="input"
          style={{ flex: "0 1 120px" }}
          min={0}
          aria-label="Maximum price per day"
        />
      </div>

      {/* Vehicle grid */}
      {initialItems.length > 0 ? (
        <>
          <motion.div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
              gap: 1,
              background: "var(--line)",
              border: "1px solid var(--line)",
            }}
            layout
          >
            {initialItems.map((v, i) => (
              <motion.div
                key={v.listingCode}
                style={{ background: "var(--paper)" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                layout
              >
                <VehicleCard vehicle={v} />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 16,
                marginTop: 32,
                paddingTop: 24,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="btn btn-ghost"
                style={{ fontSize: 11 }}
              >
                ‹ Previous
              </button>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--slate)",
                }}
              >
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="btn btn-ghost"
                style={{ fontSize: 11 }}
              >
                Next ›
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            border: "1px solid var(--line)",
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <Icon
            icon="ph:car-simple"
            width={48}
            style={{ color: "var(--thumb)", marginBottom: 16 }}
            aria-hidden="true"
          />
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: 8,
            }}
          >
            No vehicles found
          </div>
          <p style={{ color: "var(--slate)", fontSize: 14 }}>
            Try adjusting your filters or search terms.
          </p>
        </div>
      )}
    </>
  );
}
