export function isAuthorizedInternalJobRequest(request: Request) {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      code: "JOB_SECRET_MISSING",
      message: "Internal job secret is not configured.",
    } as const;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Missing job authorization.",
    } as const;
  }

  const token = authorization.slice("Bearer ".length);
  if (token !== secret) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Invalid job authorization.",
    } as const;
  }

  return { ok: true } as const;
}