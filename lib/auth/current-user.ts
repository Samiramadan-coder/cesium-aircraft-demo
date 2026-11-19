import "server-only";

import { cache } from "react";

import { api } from "@/lib/api/client";
import type { CurrentUser, Permission } from "@/types/user";

/**
 * The signed-in user with their role and permissions. `/v1/auth/me`
 * returns the same `user` object as the login response, so a role change
 * applies on the next navigation without signing in again. Cached per
 * request: the layout, pages and guards share one call.
 */
export const getCurrentUser = cache(() =>
  api.get<CurrentUser>("/v1/auth/me"),
);

export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user.permissions?.[permission]);
}
