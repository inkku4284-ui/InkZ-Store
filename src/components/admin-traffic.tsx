import "server-only";
import { getTrafficReport, type TrafficRange } from "@/lib/analytics/vercel";
import { observedOrderRate } from "@/lib/analytics/conversion";

/** Render only after the owner session check; the provider credential never reaches client props. */
export async function AdminTraffic({ since, until, granularity = "day", paidOrders, live = false }: Omit<TrafficRange, "granularity"> & { granularity?: TrafficRange["granularity"]; paidOrders?: number; live?: boolean }) {
  const report = await getTrafficReport({ since, until, granularity });
  if (report.status === "unavailable") return <section className="owner-traffic" aria-labelledby="traffic-heading">
    <h2 id="traffic-heading">Store traffic</h2>
    <p>Traffic data unavailable. Enable Vercel Web Analytics and connect the server read credential to view recorded visitors and page views.</p>
    <p>No sample statistics are shown.</p>
  </section>;
  const number = (value: number) => value.toLocaleString("en-US");
  const rate = paidOrders === undefined ? null : observedOrderRate(live, paidOrders, report.totals.visitors);
  return <section className="owner-traffic" aria-labelledby="traffic-heading">
    <h2 id="traffic-heading">Store traffic</h2>
    <p>Production · Vercel Web Analytics · {report.since.slice(0, 10)} to {report.until.slice(0, 10)} (UTC)</p>
    <dl className="owner-metrics">
      <div><dt>Recorded visitors</dt><dd>{number(report.totals.visitors)}</dd></div>
      <div><dt>Recorded page views</dt><dd>{number(report.totals.pageviews)}</dd></div>
    </dl>
    <h3>Purchase conversion</h3>
    {rate === null ? <p>Unavailable: this needs Live order data and recorded visitors for the same period.</p>
      : <><p>{rate.toFixed(2)} recorded paid orders per 100 measured visitors.</p><p>This aggregate ratio uses the same reporting window. It is not a percentage of identified customers: visitor identifiers rotate daily, analytics can be blocked, repeat purchases can increase the ratio, and unreconciled historical orders reduce sales coverage.</p></>}
    <p>Anonymous visitor identifiers rotate daily. These counts cannot identify distinct customers across days. Blocked analytics requests are not recorded.</p>
    <h3>Traffic by page</h3>
    {report.pages.length ? <div className="owner-table-wrap"><table><caption>Top 50 page paths; any remaining paths are grouped as Others</caption>
      <thead><tr><th scope="col">Page</th><th scope="col">Page views</th><th scope="col">Visitors</th></tr></thead>
      <tbody>{report.pages.map(row => <tr key={row.path}><th scope="row">{row.path}</th><td>{number(row.pageviews)}</td><td>{number(row.visitors)}</td></tr>)}</tbody>
    </table></div> : <p>No page data recorded for this period.</p>}
    <h3>{granularity === "day" ? "Daily" : granularity === "week" ? "Weekly" : "Monthly"} traffic</h3>
    <p>Calendar buckets use the provider&apos;s UTC time boundaries and may include the full boundary week or month.</p>
    {report.trend.length ? <div className="owner-table-wrap"><table><caption>Recorded traffic by {granularity}; missing buckets are not invented</caption>
      <thead><tr><th scope="col">Bucket start (UTC)</th><th scope="col">Page views</th><th scope="col">Visitors</th></tr></thead>
      <tbody>{report.trend.map(row => <tr key={row.timestamp}><th scope="row">{row.timestamp.slice(0, 10)}</th><td>{number(row.pageviews)}</td><td>{number(row.visitors)}</td></tr>)}</tbody>
    </table></div> : <p>No time buckets recorded for this period.</p>}
  </section>;
}
