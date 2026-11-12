import type { FlightZone } from "@/types/aircraft";

/** Falcon Airport: the centre of the map. */
export const FALCON_AIRPORT = {
  lat: 24.467333,
  lng: 55.626056,
};

// The airspace is fixed, so it lives here instead of coming from the API.
// The map and the zone logic only ever see a FlightZone[].
export const FLIGHT_ZONES: FlightZone[] = [
  {
    // Around Falcon Airport, roughly 4-5 km out in every direction.
    id: "zone-falcon",
    name: "Falcon Airport Zone",
    type: "normal",
    minAltitude: 0,
    maxAltitude: 5000,
    coordinates: [
      { lat: 24.453858, lng: 55.581644 },
      { lat: 24.431401, lng: 55.606317 },
      { lat: 24.435892, lng: 55.65073 },
      { lat: 24.467333, lng: 55.670468 },
      { lat: 24.498774, lng: 55.65073 },
      { lat: 24.498774, lng: 55.601382 },
    ],
  },
];
