import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getGenericErrorMessage } from "./messages";

// Field name → first error message. Dot keys ("items.0.name") are kept
// as-is, which react-hook-form's setError understands
export type FieldErrors = Record<string, string>;

export type ActionFailure = {
  ok: false;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T = void> = { ok: true; data: T } | ActionFailure;

export class ApiError extends Error {
  readonly status: number;
  // Parsed JSON body, or a text snippet for non-JSON bodies
  readonly body: unknown;

  constructor(
    status: number,
    message: string,
    body?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// 422
export class ValidationError extends ApiError {
  readonly fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors, body?: unknown) {
    super(422, message, body);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

// 401
export class UnauthorizedError extends ApiError {
  constructor(message: string, body?: unknown) {
    super(401, message, body);
    this.name = "UnauthorizedError";
  }
}

// 403: the user is signed in but not allowed, so they stay signed in
export class ForbiddenError extends ApiError {
  constructor(message: string, body?: unknown) {
    super(403, message, body);
    this.name = "ForbiddenError";
  }
}

// 404
export class NotFoundError extends ApiError {
  constructor(message: string, body?: unknown) {
    super(404, message, body);
    this.name = "NotFoundError";
  }
}

// 5xx: always carries the generic message
export class ServerError extends ApiError {
  constructor(status: number, message: string, body?: unknown) {
    super(status, message, body);
    this.name = "ServerError";
  }
}

// The request never got a response: fetch failed or timed out
export class NetworkError extends ApiError {
  readonly timedOut: boolean;

  constructor(message: string, options: { cause: unknown; timedOut: boolean }) {
    super(0, message, undefined, { cause: options.cause });
    this.name = "NetworkError";
    this.timedOut = options.timedOut;
  }
}

const SNIPPET_LENGTH = 500;

export function snippet(text: string): string {
  return text.length > SNIPPET_LENGTH
    ? `${text.slice(0, SNIPPET_LENGTH)}…`
    : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Laravel: { errors: { "items.0.name": ["The name field is required."] } }
function toFieldErrors(errors: unknown): FieldErrors {
  const fieldErrors: FieldErrors = {};
  if (!isRecord(errors)) return fieldErrors;

  for (const [field, messages] of Object.entries(errors)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (typeof first === "string") fieldErrors[field] = first;
  }

  return fieldErrors;
}

// Reads an error body that may be JSON, HTML, text or empty without throwing.
// Only a JSON `message` is shown to users; anything else gets the generic one
async function readErrorBody(
  response: Response,
): Promise<{ json?: Record<string, unknown>; text: string }> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return { text };
  }

  if (!text.trim()) return { text };

  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? { json: parsed, text } : { text };
  } catch {
    return { text };
  }
}

export async function createResponseError(
  response: Response,
  context: { method: string; url: string; genericMessage: string },
): Promise<ApiError> {
  const { status } = response;
  const { json, text } = await readErrorBody(response);
  const body = json ?? (text ? snippet(text) : undefined);
  const backendMessage =
    typeof json?.message === "string" && json.message.trim()
      ? json.message
      : undefined;
  const message = backendMessage ?? context.genericMessage;

  if (status >= 500) {
    console.error(
      `[api] ${context.method} ${context.url} → ${status}`,
      snippet(text),
    );
    return new ServerError(status, context.genericMessage, body);
  }

  switch (status) {
    case 401:
      return new UnauthorizedError(message, body);
    case 403:
      return new ForbiddenError(message, body);
    case 404:
      return new NotFoundError(message, body);
    case 422:
      return new ValidationError(message, toFieldErrors(json?.errors), body);
    default:
      return new ApiError(status, message, body);
  }
}

// Turns a caught error into a serializable Server Action result.
// Next.js redirects/notFound are rethrown, so this is safe in a catch block
export async function toActionResult(error: unknown): Promise<ActionFailure> {
  unstable_rethrow(error);

  if (error instanceof ValidationError) {
    return {
      ok: false,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error instanceof ApiError) {
    return { ok: false, message: error.message };
  }

  console.error("[api] Unexpected error", error);
  return { ok: false, message: await getGenericErrorMessage() };
}

// Wraps a Server Action body, so it doesn't need its own try/catch
// (which would also swallow redirects)
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return toActionResult(error);
  }
}
