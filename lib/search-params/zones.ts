import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

/** `active` as the API takes it: "1" active only, "0" inactive only. */
export const ZONE_ACTIVE_VALUES = ["1", "0"] as const;

/** Query params of `GET /v1/tracking/zones`; missing means no filter. */
export const zonesSearchParams = {
  /** Name contains */
  search: parseAsString.withDefault(""),
  active: parseAsStringLiteral(ZONE_ACTIVE_VALUES),
};

export const loadZonesSearchParams = createLoader(zonesSearchParams);
