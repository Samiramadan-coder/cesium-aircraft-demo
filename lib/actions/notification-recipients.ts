"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { NotificationRecipientPayload } from "@/types/notification-recipients";

export async function addNotificationRecipient(
  payload: NotificationRecipientPayload,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.post<unknown>("/v1/notification-recipients", payload),
  );
  if (result.ok) {
    revalidatePath("/[locale]/(main)/adminstration/alert-recepient", "page");
  }
  return result;
}
