"use server";

import { api } from "@/lib/api/client";
import { CurrentUser } from "@/types/user";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/lib/api/locale";
import { clearAuthToken, setAuthToken } from "@/lib/api/auth-token";
import type { LoginValues } from "@/lib/validations/auth";
import { toActionResult, type ActionFailure } from "@/lib/api/errors";
import {
  HOME_PATH,
  SIGN_IN_PATH,
  localizePath,
  safeCallbackUrl,
} from "@/lib/auth-routes";

const LOGIN_ENDPOINT = "/v1/auth/login";
const LOGOUT_ENDPOINT = "/v1/auth/logout";

// TODO: confirm the response shape with the backend and drop the
// alternatives that don't apply
type LoginResponse = {
  token: string;
  user: CurrentUser;
};

// On success sets the auth cookie and redirects (to `callbackUrl` when it's
// a safe same-site path), so it only ever returns a failure
export async function login(
  values: LoginValues,
  callbackUrl?: string | null,
): Promise<ActionFailure> {
  try {
    const response = await api.post<LoginResponse>(
      LOGIN_ENDPOINT,
      values,
      // Public endpoint; a 401 here means wrong credentials, not an
      // expired session
      {
        auth: false,
        skipAuthRedirect: true,
      },
    );

    if (!response.token) {
      console.error("[auth] Login response has no token", response);
      throw new Error("Login response has no token");
    }

    await setAuthToken(response.token);
  } catch (error) {
    return toActionResult(error);
  }

  const locale = await resolveLocale();
  redirect(safeCallbackUrl(callbackUrl, localizePath(HOME_PATH, locale)));
}

// Revokes the token on the backend, then clears the cookie and goes to the
// login page. A failed (or already expired) logout still signs out locally,
// so the user is never left stuck signed in
export async function logout(): Promise<void> {
  try {
    await api.post(LOGOUT_ENDPOINT, undefined, { skipAuthRedirect: true });
  } catch (error) {
    console.error("[auth] Logout request failed", error);
  }

  await clearAuthToken();

  const locale = await resolveLocale();
  redirect(localizePath(SIGN_IN_PATH, locale));
}
