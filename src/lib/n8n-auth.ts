export function isN8nPollAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const secrets = [
    process.env.N8N_WEBHOOK_SECRET,
    process.env.CRON_SECRET,
  ].filter((value): value is string => Boolean(value));

  return Boolean(token && secrets.includes(token));
}
