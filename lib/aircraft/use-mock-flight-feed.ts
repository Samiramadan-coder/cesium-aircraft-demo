"use client";

import { useEffect, useRef, useState } from "react";
import {
  createMockFlight,
  MOCK_AIRCRAFT,
  UPDATE_INTERVAL_MS,
} from "./mock-flight-data";
import type { AircraftUpdate } from "./types";

/**
 * Stand-in for a live tracking feed: delivers one update per aircraft per
 * second while `enabled`, each flying its own independent route. Replace
 * this hook with a WebSocket subscription later — nothing else needs to
 * change.
 */
export function useMockFlightFeed(
  enabled: boolean,
  onUpdate: (update: AircraftUpdate) => void,
) {
  const [flights] = useState(() => {
    const startTimestamp = Date.now();
    return MOCK_AIRCRAFT.map(({ id, name, callsign, route }) => ({
      id,
      name,
      callsign,
      simulation: createMockFlight(route, startTimestamp),
    }));
  });
  // Time left until the next update, kept across pause/resume so the
  // one-second cadence continues exactly where it stopped.
  const dueInRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let due = performance.now() + dueInRef.current;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      for (const { id, name, callsign, simulation } of flights) {
        onUpdate({ id, name, callsign, ...simulation.next() });
      }
      due += UPDATE_INTERVAL_MS;
      timer = setTimeout(tick, Math.max(0, due - performance.now()));
    };
    timer = setTimeout(tick, dueInRef.current);

    return () => {
      clearTimeout(timer);
      dueInRef.current = Math.max(0, due - performance.now());
    };
  }, [enabled, flights, onUpdate]);
}
