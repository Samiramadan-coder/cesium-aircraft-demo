import "server-only";

import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { Locale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import {
  CALLBACK_URL_PARAM,
  PATHNAME_HEADER,
  SIGN_IN_PATH,
  safeCallbackUrl,
} from "@/lib/auth-routes";

import { SESSION_EXPIRED, SESSION_PARAM } from "./auth-cookie";
import { clearAuthToken, getAuthToken } from "./auth-token";
import { ApiError, NetworkError, createResponseError, snippet } from "./errors";
import { resolveLocale } from "./locale";
import { getGenericErrorMessage } from "./messages";

export { toFormData } from "./form-data";

const DEFAULT_TIMEOUT = 15_000;

export type ResponseType = "json" | "text" | "blob" | "arrayBuffer" | "stream";

export type FileResponse<T> = {
  data: T;
  contentType: string | null;
  filename: string | null;
};

type ResponseData<R extends ResponseType, T> = R extends "text"
  ? string
  : R extends "blob"
    ? FileResponse<Blob>
    : R extends "arrayBuffer"
      ? ArrayBuffer
      : R extends "stream"
        ? FileResponse<ReadableStream<Uint8Array>>
        : T;

type QueryValue = string | number | boolean | null | undefined;

// Laravel's `boolean` rule rejects "true"/"false"
function toQueryString(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

export interface RequestOptions<R extends ResponseType = "json"> extends Omit<
  RequestInit,
  "method" | "body" | "headers"
> {
  // Merged over the defaults, so they can override them
  headers?: HeadersInit;
  // Arrays become `key[]=a&key[]=b`, booleans 1/0; null/undefined are skipped
  query?: QueryParams;
  responseType?: R;
  // Milliseconds; 0 disables. For "stream" it only covers the response
  // headers, so long downloads aren't cut off
  timeout?: number;
  // Throw UnauthorizedError on 401 instead of redirecting to sign-in
  skipAuthRedirect?: boolean;
  // `false` skips reading the auth cookie (public endpoints, "use cache")
  auth?: boolean;
  // Accept-Language override; pass it inside "use cache"
  locale?: Locale;
}

// Plain objects/arrays are sent as JSON; these are sent as-is and
// let fetch set the Content-Type (e.g. the multipart boundary)
function isRawBody(body: unknown): body is BodyInit {
  return (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof ReadableStream
  );
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = /^https?:\/\//.test(path)
    ? path
    : `${getBaseUrl()}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const isList = Array.isArray(value);
    const items: readonly QueryValue[] = isList ? value : [value as QueryValue];

    for (const item of items) {
      if (item !== null && item !== undefined) {
        params.append(isList ? `${key}[]` : key, toQueryString(item));
      }
    }
  }

  const search = params.toString();
  if (!search) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${search}`;
}

// Supports `filename*=UTF-8''%D8%B9.pdf` (preferred) and `filename="a.pdf"`
export function parseFilename(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) return null;

  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(
    contentDisposition,
  );
  if (extended) {
    try {
      return decodeURIComponent(extended[2].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the plain filename
    }
  }

  const quoted = /filename\s*=\s*"((?:\\.|[^"\\])*)"/i.exec(contentDisposition);
  if (quoted) return quoted[1].replace(/\\(.)/g, "$1");

  const plain = /filename\s*=\s*([^;]+)/i.exec(contentDisposition);
  return plain ? plain[1].trim() : null;
}

function emptyStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({ start: (controller) => controller.close() });
}

// Clears the token and sends the user to sign-in, coming back to the
// current page afterwards. Never returns
async function redirectToSignIn(locale: Locale): Promise<never> {
  try {
    await clearAuthToken();
  } catch (error) {
    // Cookies can't be modified while rendering a Server Component;
    // the proxy deletes the cookie when it sees `?session=expired`
    unstable_rethrow(error);
  }

  let callbackUrl: string | null = null;
  try {
    callbackUrl = safeCallbackUrl((await headers()).get(PATHNAME_HEADER), null);
  } catch (error) {
    unstable_rethrow(error);
  }

  return redirect({
    href: {
      pathname: SIGN_IN_PATH,
      query: {
        [SESSION_PARAM]: SESSION_EXPIRED,
        ...(callbackUrl ? { [CALLBACK_URL_PARAM]: callbackUrl } : {}),
      },
    },
    locale,
  });
}

async function request<T, R extends ResponseType = "json">(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions<R> = {},
): Promise<ResponseData<R, T>> {
  const {
    headers: customHeaders,
    query,
    responseType = "json" as R,
    timeout = DEFAULT_TIMEOUT,
    skipAuthRedirect = false,
    auth = true,
    locale: localeOverride,
    signal: callerSignal,
    ...init
  } = options;

  const url = buildUrl(path, query);
  const locale = localeOverride ?? (await resolveLocale());
  const token = auth ? await getAuthToken() : undefined;

  const requestHeaders = new Headers({
    Accept: "application/json",
    "Accept-Language": locale,
  });
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isRawBody(body)) {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      // Strings are assumed to be serialized already
      requestBody = typeof body === "string" ? body : JSON.stringify(body);
    }
  }

  new Headers(customHeaders).forEach((value, key) =>
    requestHeaders.set(key, value),
  );

  // A cancellable timer instead of AbortSignal.timeout(), so the timeout
  // can stop applying once a stream download has started
  const timeoutController = new AbortController();
  const timer =
    timeout > 0
      ? setTimeout(
          () =>
            timeoutController.abort(
              new DOMException(
                `Request timed out after ${timeout}ms`,
                "TimeoutError",
              ),
            ),
          timeout,
        )
      : undefined;
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, timeoutController.signal])
    : timeoutController.signal;

  const genericMessage = () => getGenericErrorMessage(locale);

  const toNetworkError = async (error: unknown) => {
    unstable_rethrow(error);
    // The caller cancelled on purpose: let them see their own abort
    if (callerSignal?.aborted) throw error;

    const timedOut = timeoutController.signal.aborted;
    console.error(
      `[api] ${method} ${url} ${timedOut ? "timed out" : "failed"}`,
      error,
    );
    throw new NetworkError(await genericMessage(), { cause: error, timedOut });
  };

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        method,
        headers: requestHeaders,
        body: requestBody,
        signal,
      });
    } catch (error) {
      return await toNetworkError(error);
    }

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect) {
        // Drain the body so the connection can be reused
        await response.body?.cancel().catch(() => {});
        return await redirectToSignIn(locale);
      }

      throw await createResponseError(response, {
        method,
        url,
        genericMessage: await genericMessage(),
      });
    }

    const contentType = response.headers.get("content-type");
    const filename = parseFilename(response.headers.get("content-disposition"));
    const isEmpty = response.status === 204 || response.status === 205;

    try {
      switch (responseType) {
        case "stream": {
          clearTimeout(timer);
          const data = isEmpty
            ? emptyStream()
            : (response.body ?? emptyStream());
          return { data, contentType, filename } as ResponseData<R, T>;
        }
        case "blob": {
          const data = isEmpty ? new Blob([]) : await response.blob();
          return { data, contentType, filename } as ResponseData<R, T>;
        }
        case "arrayBuffer":
          return (
            isEmpty ? new ArrayBuffer(0) : await response.arrayBuffer()
          ) as ResponseData<R, T>;
        case "text":
          return (isEmpty ? "" : await response.text()) as ResponseData<R, T>;
      }

      const text = isEmpty ? "" : await response.text();
      if (!text.trim()) return undefined as ResponseData<R, T>;

      try {
        return JSON.parse(text) as ResponseData<R, T>;
      } catch (error) {
        console.error(
          `[api] ${method} ${url} → ${response.status} with invalid JSON`,
          snippet(text),
        );
        throw new ApiError(
          response.status,
          await genericMessage(),
          snippet(text),
          {
            cause: error,
          },
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Reading the body failed (connection dropped or timed out mid-way)
      return await toNetworkError(error);
    }
  } finally {
    clearTimeout(timer);
  }
}

type BodyMethod = <T = unknown, R extends ResponseType = "json">(
  path: string,
  body?: unknown,
  options?: RequestOptions<R>,
) => Promise<ResponseData<R, T>>;

type BodylessMethod = <T = unknown, R extends ResponseType = "json">(
  path: string,
  options?: RequestOptions<R>,
) => Promise<ResponseData<R, T>>;

// Server-side client for the Laravel API. Errors are thrown as ApiError
// subclasses (see ./errors); a 401 redirects to sign-in unless
// `skipAuthRedirect` is set
export const api: {
  get: BodylessMethod;
  delete: BodylessMethod;
  post: BodyMethod;
  put: BodyMethod;
  patch: BodyMethod;
} = {
  get: (path, options) => request("GET", path, undefined, options),
  delete: (path, options) => request("DELETE", path, undefined, options),
  post: (path, body, options) => request("POST", path, body, options),
  put: (path, body, options) => request("PUT", path, body, options),
  patch: (path, body, options) => request("PATCH", path, body, options),
};
