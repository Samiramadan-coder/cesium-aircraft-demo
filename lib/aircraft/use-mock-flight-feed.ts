"use client";

import { useEffect, useRef, useState } from "react";
import { createMockFlight, UPDATE_INTERVAL_MS } from "./mock-flight-data";
import type { AircraftPosition } from "./types";

/**
 * Stand-in for a live tracking feed: delivers one position update per second
 * while `enabled`. Replace this hook with a WebSocket subscription later —
 * nothing else needs to change.
 */
export function useMockFlightFeed(
  enabled: boolean,
  onUpdate: (position: AircraftPosition) => void,
) {
  const [flight] = useState(() => createMockFlight());
  // Time left until the next update, kept across pause/resume so the
  // one-second cadence continues exactly where it stopped.
  const dueInRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let due = performance.now() + dueInRef.current;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      onUpdate(flight.next());
      due += UPDATE_INTERVAL_MS;
      timer = setTimeout(tick, Math.max(0, due - performance.now()));
    };
    timer = setTimeout(tick, dueInRef.current);

    return () => {
      clearTimeout(timer);
      dueInRef.current = Math.max(0, due - performance.now());
    };
  }, [enabled, flight, onUpdate]);
}
