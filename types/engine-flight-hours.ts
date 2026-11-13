// Fleet
export type KPIS = {
  avgUtilizationHours: number;
  dueSoonCount: number;
  overdueCount: number;
  totalEngineHours: number;
  totalFlightHours: number;
  totalFlights: number;
};

type NextService = {
  daysRemaining: null | number;
  dueDate: null | string;
  hoursRemaining: number;
  hoursSinceService: number;
  intervalHours: number;
  intervalMonths: null | number;
  lastServiceDate: null | string;
  lastServiceHours: number;
  nextDueHours: number;
  status: "onTrack";
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
  status: "onTrack";
};
