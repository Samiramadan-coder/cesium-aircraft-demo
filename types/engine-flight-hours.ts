import type { TrackedAircraft } from "@/types/tracking";

// Fleet
export type KPIS = {
  avgUtilizationHours: number;
  dueSoonCount: number;
  overdueCount: number;
  totalEngineHours: number;
  totalFlightHours: number;
  totalFlights: number;
};

export type ServiceStatus = "onTrack" | "dueSoon" | "overdue";

export type NextService = {
  daysRemaining: null | number;
  dueDate: null | string;
  hoursRemaining: number;
  hoursSinceService: number;
  intervalHours: number;
  intervalMonths: null | number;
  lastServiceDate: null | string;
  lastServiceHours: number;
  nextDueHours: number;
  status: ServiceStatus;
  type: string;
};

export type AirCraft = {
  aircraftId: string;
  flights: number;
  hoursRemaining: null | number;
  hoursSinceService: null | number;
  lastServiceHours: null | number;
  lifetimeHours: number;
  nextDueHours: null | number;
  nextService: null | NextService;
  periodEngineHours: number;
  periodFlightHours: number;
  status: ServiceStatus;
};

/** Fleet hours merged with the aircraft's profile from `/v1/aircraft`. */
export type FleetAircraft = AirCraft & {
  profile: TrackedAircraft | null;
};

// Aircraft details — GET /v1/tracking/hours/aircraft/{id}
export type UtilizationDay = {
  date: string;
  engineHours: number;
  flightHours: number;
};

// TODO: "warnings" comes from the design; only the other two seen from the API so far.
export type Compliance = "compliant" | "warnings" | "violation";

export type FlightLogEntry = {
  flightId: string;
  aircraftId: string;
  pilotId: string | null;
  takeoffTime: number;
  flightType: string;
  hobbsStart: number;
  hobbsEnd: number;
  flightTimeMin: number;
  engineTimeMin: number;
  compliance: Compliance;
};

export type AircraftHoursDetails = {
  aircraftId: string;
  overview: {
    lifetimeHours: number;
    periodFlightHours: number;
    periodEngineHours: number;
    flights: number;
    nextService: NextService | null;
    status: ServiceStatus;
  };
  utilization: UtilizationDay[];
  schedule: NextService[];
  maintenanceHistory: unknown[];
  flightLog: FlightLogEntry[];
};

// Pilots
// GET /v1/tracking/hours/pilots
export type PilotHours = {
  pilotId: string;
  flights: number;
  flightHours: number;
  engineHours: number;
  lastFlightAt: number | null;
  aircraftIds: string[];
};

// Daily Logs
// GET /v1/tracking/hours/daily-log — same shape as an aircraft's flight log
export type DailyLogEntry = FlightLogEntry;
