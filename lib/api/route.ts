import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "./auth-cookie";
import { ApiError, NetworkError, ValidationError } from "./errors";
import type { FieldErrors } from "./errors";
import { getGenericErrorMessage } from "./messages";

export type ErrorResponseBody = { message: string; errors?: FieldErrors };

// For Route Handlers called by browser fetch (whose API calls should use
// `skipAuthRedirect: true`): turns a caught error into a JSON response
export async function toErrorResponse(
  error: unknown,
): Promise<NextResponse<ErrorResponseBody>> {
  unstable_rethrow(error);

  if (!(error instanceof ApiError)) {
    console.error("[api] Unexpected error in Route Handler", error);
    return NextResponse.json(
      { message: await getGenericErrorMessage() },
      { status: 500 },
    );
  }

  let status = error.status;
  if (error instanceof NetworkError) status = 503;
  // A 2xx with an unreadable body is still a failure from the browser's view
  else if (status < 400) status = 502;

  const response = NextResponse.json<ErrorResponseBody>(
    error instanceof ValidationError
      ? { message: error.message, errors: error.fieldErrors }
      : { message: error.message },
    { status },
  );

  if (error.status === 401) response.cookies.delete(AUTH_COOKIE_NAME);

  return response;
}
