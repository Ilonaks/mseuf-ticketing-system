import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export const LIVE_INTERVAL_MS = 5000;

// Calls `refresh` every few seconds while the app is in the foreground, and right away
// when the user returns to the app, so changes from other users show up by themselves.
export default function usePolling(refresh, { interval = LIVE_INTERVAL_MS, enabled = true } = {}) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) return;

    let running = false;
    const tick = async () => {
      if (running || AppState.currentState !== "active") return;
      running = true; // never overlap two refreshes if the server is slow
      try {
        await refreshRef.current();
      } finally {
        running = false;
      }
    };

    const timer = setInterval(tick, interval);
    const sub = AppState.addEventListener("change", (state) => state === "active" && tick());

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [interval, enabled]);
}
