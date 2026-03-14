/** Send an event to Sentry via HTTP Store API (for use in Convex actions/HTTP handlers). */
export async function sentryCaptureEvent(
  level: "error" | "warning" | "info",
  message: string,
  extra?: Record<string, unknown>,
) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const match = dsn.match(/^https:\/\/(.+?)@(.+?)\/(.+)$/);
  if (!match) return;
  const [, publicKey, host, projectId] = match;

  const url = `https://${host}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      level,
      environment: "production",
      logger: "convex",
      message: { formatted: message },
      extra,
    }),
  }).catch(() => {
    // Non-fatal — don't let Sentry failures affect the main flow
  });
}
