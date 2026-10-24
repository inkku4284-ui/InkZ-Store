import assert from "node:assert/strict";
import { test } from "node:test";
import { getTrafficReport } from "../../src/lib/analytics/vercel";

const env = { INKZ_ANALYTICS: "vercel", INKZ_VERCEL_ANALYTICS_TOKEN: "fixture-token-never-real",
  INKZ_VERCEL_PROJECT_ID: "prj_fixture", INKZ_VERCEL_TEAM_ID: "team_fixture" };
const range = { since: new Date("2026-10-01T00:00:00Z"), until: new Date("2026-10-23T23:59:59.999Z"), granularity: "day" as const };

test("traffic queries the official scoped production API and returns only validated aggregates", async () => {
  const calls: URL[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(url.origin, "https://api.vercel.com");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${env.INKZ_VERCEL_ANALYTICS_TOKEN}`);
    assert.equal(url.searchParams.get("projectId"), env.INKZ_VERCEL_PROJECT_ID);
    assert.equal(url.searchParams.get("teamId"), env.INKZ_VERCEL_TEAM_ID);
    assert.equal(url.searchParams.get("filter"), "environment eq 'production'");
    assert.equal(url.searchParams.get("since"), range.since.toISOString());
    if (url.pathname.endsWith("/count")) return Response.json({ version: 1, data: { pageviews: 23, visitors: 17, secret: "omit" } });
    if (url.searchParams.get("by") === "day") return Response.json({ version: 1, data: [{ timestamp: "2026-10-03T00:00:00Z", pageviews: 23, visitors: 17, visitorId: "omit" }] });
    assert.equal(url.searchParams.get("by"), "requestPath");
    return Response.json({ version: 1, data: [{ requestPath: "/products/combat-framework", pageviews: 23, visitors: 17, userId: "omit" }] });
  };
  const report = await getTrafficReport(range, env, transport);
  assert.equal(report.status, "available");
  if (report.status !== "available") return;
  assert.deepEqual(report.totals, { pageviews: 23, visitors: 17 });
  assert.deepEqual(report.pages, [{ path: "/products/combat-framework", pageviews: 23, visitors: 17 }]);
  assert.deepEqual(report.trend, [{ timestamp: "2026-10-03T00:00:00.000Z", pageviews: 23, visitors: 17 }]);
  assert.equal(calls.length, 3);
  assert.equal(JSON.stringify(report).includes("omit"), false);
  assert.equal(JSON.stringify(report).includes(env.INKZ_VERCEL_ANALYTICS_TOKEN), false);
});

test("missing analytics configuration makes no network request or synthetic totals", async () => {
  for (const invalid of [{ INKZ_ANALYTICS: "off" }, { INKZ_VERCEL_ANALYTICS_TOKEN: "" }, { INKZ_VERCEL_PROJECT_ID: "https://attacker.invalid" }, { INKZ_VERCEL_TEAM_ID: "" }]) {
    const report = await getTrafficReport(range, { ...env, ...invalid }, async () => { throw new Error("must not call"); });
    assert.deepEqual(report, { status: "unavailable", reason: "not-configured" });
  }
});

test("provider failure and malformed metrics remain unavailable instead of zero", async () => {
  for (const response of [new Response("disabled", { status: 400 }), Response.json({ version: 1, data: { pageviews: -1, visitors: 7 } }),
    Response.json({ version: 1, data: { pageviews: 5, visitors: "7" } }), Response.json({ version: 2, data: { pageviews: 5, visitors: 7 } })]) {
    const report = await getTrafficReport(range, env, async () => response.clone());
    assert.deepEqual(report, { status: "unavailable", reason: "provider-unavailable" });
  }
  assert.deepEqual(await getTrafficReport(range, env, async () => { throw new Error("private provider token"); }), { status: "unavailable", reason: "provider-unavailable" });
});

test("zero provider counts are real zero and absent time buckets stay absent", async () => {
  const report = await getTrafficReport(range, env, async input => Response.json({ version: 1,
    data: String(input).includes("/count?") ? { pageviews: 0, visitors: 0 } : [] }));
  assert.equal(report.status, "available");
  if (report.status === "available") {
    assert.deepEqual(report.totals, { pageviews: 0, visitors: 0 });
    assert.deepEqual(report.trend, []);
  }
});

test("invalid or unbounded dates are rejected before transmission", async () => {
  for (const invalid of [{ since: new Date("bad") }, { since: new Date("2027-01-01") }, { until: new Date("2028-01-01") }, { granularity: "hour" }]) {
    const report = await getTrafficReport({ ...range, ...invalid } as typeof range, env, async () => { throw new Error("must not call"); });
    assert.deepEqual(report, { status: "unavailable", reason: "invalid-range" });
  }
});

test("daily, weekly and monthly requests use only the selected time dimension", async () => {
  for (const granularity of ["day", "week", "month"] as const) {
    const groups: string[] = [];
    await getTrafficReport({ ...range, granularity }, env, async input => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/count")) return Response.json({ version: 1, data: { pageviews: 0, visitors: 0 } });
      groups.push(url.searchParams.get("by")!);
      return Response.json({ version: 1, data: [] });
    });
    assert.deepEqual(groups.sort(), [granularity, "requestPath"].sort());
  }
});

test("invalid, oversized and identifying provider aggregates remain unavailable", async () => {
  const invalidRows = [
    [{ requestPath: "/download?session_id=private", pageviews: 1, visitors: 1 }],
    [{ requestPath: "javascript:alert(1)", pageviews: 1, visitors: 1 }],
    [{ requestPath: "/", pageviews: 1, visitors: 1 }, { requestPath: "/", pageviews: 1, visitors: 1 }],
    Array.from({ length: 52 }, (_, i) => ({ requestPath: `/page-${i}`, pageviews: 1, visitors: 1 })),
  ];
  for (const rows of invalidRows) {
    const report = await getTrafficReport(range, env, async input => {
      const url = new URL(String(input));
      return Response.json({ version: 1, data: url.pathname.endsWith("/count") ? { pageviews: 1, visitors: 1 }
        : url.searchParams.get("by") === "day" ? [] : rows });
    });
    assert.deepEqual(report, { status: "unavailable", reason: "provider-unavailable" });
  }
  assert.deepEqual(await getTrafficReport(range, env, async () => new Response(" ".repeat(1_048_577))), { status: "unavailable", reason: "provider-unavailable" });
});
