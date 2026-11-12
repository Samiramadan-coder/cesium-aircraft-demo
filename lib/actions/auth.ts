"use server";

import { redirect } from "next/navigation";

import { api } from "@/lib/api/client";
import { resolveLocale } from "@/lib/api/locale";
import { setAuthToken } from "@/lib/api/auth-token";
import type { LoginValues } from "@/lib/validations/auth";
import { toActionResult, type ActionFailure } from "@/lib/api/errors";
import { HOME_PATH, localizePath, safeCallbackUrl } from "@/lib/auth-routes";

const LOGIN_ENDPOINT = "/auth/login";

// TODO: confirm the response shape with the backend and drop the
// alternatives that don't apply
type LoginResponse = {
  token?: string;
  access_token?: string;
  expires_in?: number;
  data?: { token?: string; access_token?: string; expires_in?: number };
};

function readToken(response: LoginResponse | undefined) {
  const source = response?.data ?? response;
  const token = source?.token ?? source?.access_token;
  return token ? { token, expiresIn: source?.expires_in } : null;
}

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
      { auth: false, skipAuthRedirect: true },
    );

    const result = readToken(response);
    if (!result) {
      console.error("[auth] Login response has no token", response);
      throw new Error("Login response has no token");
    }

    await setAuthToken(result.token, { maxAge: result.expiresIn });
  } catch (error) {
    return toActionResult(error);
  }

  const locale = await resolveLocale();
  redirect(safeCallbackUrl(callbackUrl, localizePath(HOME_PATH, locale)));
}
