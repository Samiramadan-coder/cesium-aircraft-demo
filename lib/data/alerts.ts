import "server-only";

import { api } from "@/lib/api/client";
import type { Alert, KPIS } from "@/types/alerts";
import type { Paginated } from "@/types/flights";
import type { toAlertsQuery } from "@/lib/search-params/alerts";

export const getAlertKpis = () => api.get<KPIS>("/v1/tracking/alerts/kpis");

export const getAlerts = (query?: ReturnType<typeof toAlertsQuery>) =>
  api.get<Paginated<Alert>>("/v1/tracking/alerts", { query });
