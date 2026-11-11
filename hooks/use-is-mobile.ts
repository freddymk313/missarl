"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the viewport width is below the given breakpoint (default: 640px = Tailwind `sm`).
 * Avoids hydration mismatch by initialising to `false` on the server and
 * re-computing after first paint.
 */
export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler(); // set immediately on mount
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

