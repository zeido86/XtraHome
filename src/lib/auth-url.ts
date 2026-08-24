function isValidAuthOrigin(value?: string) {
  if (!value?.trim()) return false;
  const raw = value.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (!host.includes(".")) return false;
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveAuthUrl() {
  const explicit = process.env.NEXTAUTH_URL?.trim() ?? "";
  if (isValidAuthOrigin(explicit)) {
    return new URL(
      /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`,
    ).origin;
  }

  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    ""
  )
    .trim()
    .replace(/^https?:\/\//, "");

  if (vercelHost) return `https://${vercelHost}`;
  return "http://localhost:3000";
}

export function ensureNextAuthUrl() {
  process.env.NEXTAUTH_URL = resolveAuthUrl();
}
