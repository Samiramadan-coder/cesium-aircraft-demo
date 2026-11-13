import type { Compliance } from "@/types/engine-flight-hours";
import type { LatLon } from "@/types/tracking";

export type KPIS = {
  avgFlightDurationMin: number;
  complianceRate: number;
  flightsWithViolations: number;
  totalEngineHours: number;
  totalFlightHours: number;
  totalFlights: number;
};

export type FlightEvent = {
  type: string;
  count: number;
};

export type Flight = {
  id: string;
  aircraftId: string;
  aircraftType: string;
  pilotId: string | null;
  flightType: string;
  bookingRef: string | null;
  state: string;
  /** Unix epoch, milliseconds */
  engineStartTime: number;
  engineShutdownTime: number | null;
  takeoffTime: number | null;
  landingTime: number | null;
  flightTimeMin: number;
  engineTimeMin: number;
  maxAltitudeFt: number;
  distanceNm: number;
  compliance: Compliance;
  hobbsStart: number;
  hobbsEnd: number;
  events: FlightEvent[];
  route: LatLon[];
};

/** Laravel paginator envelope. */
export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export type FlightsSummary = {
  hoursByAircraft: { aircraftId: string; flightHours: number; flights: number }[];
  /** One entry per calendar day ("YYYY-MM-DD"), oldest first. */
  violationsTrend: { date: string; count: number }[];
  topPilots: { pilotId: string; flightHours: number; flights: number }[];
};

export type ReplayPoint = {
  /** Unix epoch, milliseconds */
  time: number;
  lat: number;
  lon: number;
  altitudeFt: number;
  heightAglFt: number;
  groundSpeedKt: number;
  headingDeg: number;
  verticalSpeedFpm: number;
  engineOn: boolean;
  status: string;
  distanceFromOmefNm: number;
};

export type FlightReplay = {
  flight: Flight;
  points: ReplayPoint[];
};

export type FlightAlert = {
  id: string;
  type: string;
  severity: "warning" | "critical" | (string & {});
  /** Already localized by the API. */
  title: string;
  zoneId: string | null;
  /** Unix epoch, milliseconds */
  triggeredAt: number;
  endedAt: number | null;
  durationSec: number | null;
  location: string | null;
};

export type FlightEvents = {
  timeline: {
    id: string;
    type: string;
    time: number;
    data: Record<string, unknown>;
  }[];
  alerts: FlightAlert[];
};
