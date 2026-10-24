import "server-only";

type Env = Readonly<Record<string, string | undefined>>;
export type TrafficRange = { since: Date; until: Date; granularity: "day" | "week" | "month" };
type Counts = { pageviews: number; visitors: number };
export type TrafficReport = {
  status: "available"; source: "Vercel Web Analytics"; environment: "production";
  since: string; until: string; granularity: TrafficRange["granularity"];
  totals: Counts; trend: (Counts & { timestamp: string })[]; pages: (Counts & { path: string })[];
} | { status: "unavailable"; reason: "not-configured" | "invalid-range" | "provider-unavailable" };

/** Server-only read adapter. A provider error is missing data, never a zero or a sample. */
export async function getTrafficReport(range: TrafficRange, env: Env = process.env, transport: typeof fetch = fetch): Promise<TrafficReport> {
  const token = env.INKZ_VERCEL_ANALYTICS_TOKEN ?? "";
  const project = env.INKZ_VERCEL_PROJECT_ID ?? "";
  const team = env.INKZ_VERCEL_TEAM_ID ?? "";
  if (env.INKZ_ANALYTICS !== "vercel" || !/^[A-Za-z0-9_-]{16,500}$/.test(token) ||
      !/^prj_[A-Za-z0-9]+$/.test(project) || !/^team_[A-Za-z0-9]+$/.test(team)) {
    return { status: "unavailable", reason: "not-configured" };
  }
  const since = range.since.getTime();
  const until = range.until.getTime();
  if (!Number.isFinite(since) || !Number.isFinite(until) || until <= since || until - since > 366 * 86400_000 ||
      !["day", "week", "month"].includes(range.granularity)) return { status: "unavailable", reason: "invalid-range" };
  try {
    const query = async (kind: "count" | "aggregate", by?: string) => {
      const url = new URL(`https://api.vercel.com/v1/query/web-analytics/visits/${kind}`);
      url.search = new URLSearchParams({ teamId: team, projectId: project, since: range.since.toISOString(),
        until: range.until.toISOString(), filter: "environment eq 'production'", ...(by ? { by, limit: by === "requestPath" ? "50" : "400" } : {}) }).toString();
      const response = await transport(url, { method: "GET", cache: "no-store", redirect: "error",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok || !response.body) throw new Error("analytics unavailable");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1_048_576) { await reader.cancel(); throw new Error("analytics response too large"); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const result: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!record(result) || result.version !== 1) throw new Error("analytics response invalid");
      return result.data;
    };
    const [total, trend, pages] = await Promise.all([query("count"), query("aggregate", range.granularity), query("aggregate", "requestPath")]);
    if (!counts(total) || !Array.isArray(trend) || !Array.isArray(pages) || trend.length > 400 || pages.length > 51) throw new Error("analytics response invalid");
    const timestamps = new Set<string>();
    const parsedTrend = trend.map(row => {
      if (!counts(row) || typeof row.timestamp !== "string" || !Number.isFinite(Date.parse(row.timestamp))) throw new Error("analytics time invalid");
      const timestamp = new Date(row.timestamp).toISOString();
      if (timestamps.has(timestamp)) throw new Error("analytics time duplicated");
      timestamps.add(timestamp);
      return { timestamp, pageviews: row.pageviews, visitors: row.visitors };
    }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const paths = new Set<string>();
    const parsedPages = pages.map(row => {
      if (!counts(row) || typeof row.requestPath !== "string" || row.requestPath.length > 2048 ||
          (!row.requestPath.startsWith("/") && row.requestPath !== "Others") || /[\r\n\0?#]/.test(row.requestPath) || paths.has(row.requestPath)) throw new Error("analytics path invalid");
      paths.add(row.requestPath);
      return { path: row.requestPath, pageviews: row.pageviews, visitors: row.visitors };
    }).sort((a, b) => b.pageviews - a.pageviews);
    return { status: "available", source: "Vercel Web Analytics", environment: "production", since: range.since.toISOString(),
      until: range.until.toISOString(), granularity: range.granularity, totals: { pageviews: total.pageviews, visitors: total.visitors }, trend: parsedTrend, pages: parsedPages };
  } catch {
    // Never return provider bodies, query errors, project identifiers, or credentials to the dashboard.
    return { status: "unavailable", reason: "provider-unavailable" };
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function counts(value: unknown): value is Record<string, unknown> & Counts {
  return record(value) && typeof value.pageviews === "number" && Number.isSafeInteger(value.pageviews) && value.pageviews >= 0 &&
    typeof value.visitors === "number" && Number.isSafeInteger(value.visitors) && value.visitors >= 0;
}
