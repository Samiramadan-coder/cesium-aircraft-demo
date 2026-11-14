"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type {
  AcknowledgeAlertPayload,
  AlertRulePayload,
  AssignAlertPayload,
  ResolveAlertPayload,
} from "@/types/alerts";

/** `/v1/tracking/alerts/{id}/{action}` */
const alertPath = (alertId: string, action: string) =>
  `/v1/tracking/alerts/${encodeURIComponent(alertId)}/${action}`;

/**
 * Runs a change and, when it succeeds, refreshes the alerts pages — the
 * table and the KPIs (rendered by the layout) both come from the server.
 */
async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(fn);
  if (result.ok) revalidatePath("/[locale]/(main)/alerts", "layout");
  return result;
}

export async function acknowledgeAlert(
  alertId: string,
  payload: AcknowledgeAlertPayload,
): Promise<ActionResult<unknown>> {
  return mutate(() =>
    api.post<unknown>(alertPath(alertId, "acknowledge"), payload),
  );
}

export async function assignAlert(
  alertId: string,
  payload: AssignAlertPayload,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.post<unknown>(alertPath(alertId, "assign"), payload));
}

export async function resolveAlert(
  alertId: string,
  payload: ResolveAlertPayload,
): Promise<ActionResult<unknown>> {
  return mutate(() =>
    api.post<unknown>(alertPath(alertId, "resolve"), payload),
  );
}

export async function updateAlertRule(
  ruleId: string,
  payload: AlertRulePayload,
): Promise<ActionResult<unknown>> {
  return mutate(() =>
    api.put<unknown>(
      `/v1/tracking/alert-rules/${encodeURIComponent(ruleId)}`,
      payload,
    ),
  );
}
