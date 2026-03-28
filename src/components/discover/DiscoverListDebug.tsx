"use client";

import { useEffect } from "react";

/**
 * Logs discover counts in the browser when NEXT_PUBLIC_DEBUG_DISCOVER=1 (Vercel env).
 * Always logs in development.
 */
export default function DiscoverListDebug({
  page,
  roleLabel,
  total,
  shown,
}: {
  page: string;
  roleLabel: string;
  total: number;
  shown: number;
}) {
  useEffect(() => {
    const debug =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_DEBUG_DISCOVER === "1";
    if (debug) {
      console.info(`[Discover ${page}] ${roleLabel}: total=${total}, pageItems=${shown}`);
    }
  }, [page, roleLabel, total, shown]);
  return null;
}
