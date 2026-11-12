import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "./auth-cookie";

export async function getAuthToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value || undefined;
}

// Only works in Server Actions and Route Handlers
export async function setAuthToken(
  token: string,
  options: { maxAge?: number } = {},
): Promise<void> {
  (await cookies()).set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: options.maxAge,
  });
}

// Only works in Server Actions and Route Handlers; throws while rendering
export async function clearAuthToken(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE_NAME);
}
