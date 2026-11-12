import { useEffect, useRef } from "react";

export const LIVE_INTERVAL_MS = 5000;

// Calls `refresh` every few seconds while the tab is visible, and right away when the
// user comes back to the tab, so data from other users shows up without reloading.
// The latest `refresh` is always used, so callers don't need to memoize it.
export default function usePolling(refresh, { interval = LIVE_INTERVAL_MS, enabled = true } = {}) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) return;

    let running = false;
    const tick = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true; // never overlap two refreshes if the server is slow
      try {
        await refreshRef.current();
      } finally {
        running = false;
      }
    };

    const timer = setInterval(tick, interval);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [interval, enabled]);
}
