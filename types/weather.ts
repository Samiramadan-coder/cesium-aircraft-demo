/** Current weather at the airport, as shown in the header. */
export type AirportWeather = {
  observedAt: string;
  source: string;
  station: string;
  temperatureC: number;
  weatherCode: number;
  windDirectionDeg: number;
  windSpeedKt: number;
};
