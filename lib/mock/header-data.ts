import type { CurrentUser } from "@/types/user";
import type { AirportWeather } from "@/types/weather";

// Placeholder data for the header until the backend endpoints exist. Each
// value is passed in as a prop, so replacing it later only touches
// app/[locale]/(main)/layout.tsx.

// TODO: the signed-in user (e.g. GET /v1/auth/me).
export const MOCK_CURRENT_USER: CurrentUser = {
  name: "Khalid Al Mansoori",
  role: "super_admin",
};

// TODO: the current weather at the airport.
export const MOCK_AIRPORT_WEATHER: AirportWeather = {
  station: "OMEF",
  temperature: 34,
  weatherCode: 2, // partly cloudy
  isDay: true,
};

// TODO: from the alerts / notifications endpoint.
export const MOCK_HAS_UNREAD_NOTIFICATIONS = true;
