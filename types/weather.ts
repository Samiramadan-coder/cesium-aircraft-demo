/** Current weather at the airport, as shown in the header. */
export type AirportWeather = {
  /** ICAO code of the airport, shown next to the temperature. */
  station: string;
  /** Air temperature, in °C. */
  temperature: number;
  /** WMO weather interpretation code (0 = clear sky, 3 = overcast, ...). */
  weatherCode: number;
  isDay: boolean;
};
