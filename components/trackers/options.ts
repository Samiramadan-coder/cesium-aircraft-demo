// TODO: confirm these lists with the backend (or load them from the API).
export const TRACKER_MODELS = ["Teltonika FMC650", "Teltonika FMC234"] as const;

/** SIM operators and their default APN. */
export const SIM_CARRIERS = [
  { value: "e&", apn: "etisalat.ae" },
  { value: "du", apn: "du.internet" },
] as const;

// Match the keys in `Trackers.addDialog.powerSources` / `engineInputs`.
export const POWER_SOURCES = ["internal", "aircraft"] as const;
export const ENGINE_INPUTS = ["motion", "ignition"] as const;
