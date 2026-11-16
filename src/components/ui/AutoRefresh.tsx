"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Milliseconds between refreshes. Defaults to 15 000. */
  intervalMs?: number;
}

/**
 * Invisible client component that calls router.refresh() on a fixed interval.
 * Clears the interval on unmount to prevent memory leaks.
 */
export function AutoRefresh({ intervalMs = 15_000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
