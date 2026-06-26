function normalizeBaseUsername(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "listener";
}

export function buildUsernameCandidates(name: string, email: string) {
  const emailBase = email.split("@")[0] ?? "listener";
  const base = normalizeBaseUsername(name || emailBase);
  const emailCandidate = normalizeBaseUsername(emailBase);

  return Array.from(new Set([base, emailCandidate, `${base}-${Math.floor(Date.now() / 1000)}`]));
}

export async function generateUniqueUsername(
  name: string,
  email: string,
  exists: (username: string) => Promise<boolean>,
) {
  const candidates = buildUsernameCandidates(name, email);

  for (const candidate of candidates) {
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  let suffix = 2;
  const base = candidates[0];
  while (await exists(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}