import { NextResponse } from "next/server";

export type ApiMeta = {
  requestId?: string;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: ApiMeta;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorPayload;
  meta?: ApiMeta;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

function buildHeaders(requestId?: string, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  if (requestId) {
    nextHeaders.set("x-request-id", requestId);
  }

  return nextHeaders;
}

export function success<T>(
  data: T,
  options?:
    | number
    | {
        status?: number;
        requestId?: string;
        headers?: HeadersInit;
      },
) {
  const normalized =
    typeof options === "number"
      ? { status: options }
      : { status: options?.status ?? 200, requestId: options?.requestId, headers: options?.headers };

  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, meta: normalized.requestId ? { requestId: normalized.requestId } : undefined },
    {
      status: normalized.status,
      headers: buildHeaders(normalized.requestId, normalized.headers),
    },
  );
}

export function failure({
  status,
  code,
  message,
  details,
  requestId,
  headers,
}: {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  headers?: HeadersInit;
}) {
  return NextResponse.json<ApiFailure>(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
      meta: requestId ? { requestId } : undefined,
    },
    {
      status,
      headers: buildHeaders(requestId, headers),
    },
  );
}

export function unauthorized(requestId?: string) {
  return failure({
    status: 401,
    code: "UNAUTHORIZED",
    message: "Unauthorized",
    requestId,
  });
}

export function invalidPayload(message: string, details?: unknown, requestId?: string) {
  return failure({
    status: 400,
    code: "INVALID_PAYLOAD",
    message,
    details,
    requestId,
  });
}

export function rateLimited({
  message,
  requestId,
  retryAfterSeconds,
  details,
}: {
  message?: string;
  requestId?: string;
  retryAfterSeconds: number;
  details?: unknown;
}) {
  return failure({
    status: 429,
    code: "RATE_LIMITED",
    message: message ?? "Too many requests. Please slow down.",
    details,
    requestId,
    headers: {
      "Retry-After": String(retryAfterSeconds),
    },
  });
}
