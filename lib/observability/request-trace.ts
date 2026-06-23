import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type TraceLogFields = Record<string, unknown>;

function emit(level: LogLevel, payload: TraceLogFields) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

export function createRequestTrace(request: Request, routeName: string) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  let userId: string | undefined;

  function baseFields(extra?: TraceLogFields) {
    return {
      requestId,
      routeName,
      method: request.method,
      userId,
      ...extra,
    };
  }

  return {
    requestId,
    assignUserId(nextUserId: string) {
      userId = nextUserId;
    },
    info(event: string, fields?: TraceLogFields) {
      emit("info", baseFields({ event, ...fields }));
    },
    warn(event: string, fields?: TraceLogFields) {
      emit("warn", baseFields({ event, ...fields }));
    },
    error(event: string, error: unknown, fields?: TraceLogFields) {
      emit(
        "error",
        baseFields({
          event,
          error: serializeError(error),
          ...fields,
        }),
      );
    },
    complete(status: number, fields?: TraceLogFields) {
      emit(
        status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        baseFields({
          event: "request.completed",
          status,
          durationMs: Date.now() - startedAt,
          ...fields,
        }),
      );
    },
  };
}
