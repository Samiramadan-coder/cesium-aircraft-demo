"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { StaffPayload } from "@/types/user";

export async function addStaffMember(
  payload: StaffPayload,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() => api.post<unknown>("/v1/users", payload));
  if (result.ok) revalidatePath("/[locale]/(main)/staff", "page");
  return result;
}
