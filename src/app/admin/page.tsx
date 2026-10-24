import Link from "next/link";
import { getAdminContext, requireOwner } from "@/lib/admin/auth";
import { salesMetrics, salesRange } from "@/lib/admin/metrics";

const money = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "THB" }).format(minor / 100);

export default async function OwnerDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const owner = await requireOwner();
  const context = getAdminContext();
  if (!owner || !context) return <section className="owner-access" aria-labelledby="owner-title">
    <p className="owner-kicker">InkZ / Private studio</p>
    <h1 id="owner-title">Owner access.</h1>
    <p>This workspace is restricted to the store owner. Customer purchases do not require an account.</p>
    {context ? <form action="/api/admin/auth/login" method="post"><button className="owner-button" type="submit">Continue with GitHub <span aria-hidden="true">↗</span></button></form>
      : <p className="owner-notice" role="status">Owner sign-in is not configured on this deployment.</p>}
    <Link href="/">Return to store</Link>
  </section>;
  const range = salesRange((await searchParams).period);
  let metrics;
  try { metrics = await salesMetrics(context.db, context.config.live, range); }
  catch { return <section className="owner-access"><h1>Sales data unavailable.</h1><p>The ledger could not be read. Try again later.</p></section>; }
  return <>
    <header className="owner-heading"><div><p className="owner-kicker">InkZ / Private studio / {context.config.live ? "Live" : "Sandbox"}</p>
      <h1>Store overview.</h1><p>Captured payments and their current adjustments, directly from the order ledger.</p></div>
      <form action="/api/admin/auth/logout" method="post"><button className="owner-text-button" type="submit">Sign out</button></form>
    </header>
    <nav className="owner-nav" aria-label="Owner workspace"><Link href="/admin" aria-current="page">Overview</Link></nav>
    <section aria-labelledby="sales-title">
      <div className="owner-section-heading"><div><p className="owner-kicker">Commerce</p><h2 id="sales-title">Sales & revenue</h2></div>
        <form className="owner-range" action="/admin" method="get"><label htmlFor="report-period">Reporting window</label>
          <select id="report-period" name="period" defaultValue={range.interval}><option value="day">Daily · 30 days</option><option value="week">Weekly · 12 weeks</option><option value="month">Monthly · 365 days</option></select>
          <button className="owner-text-button" type="submit">Apply</button></form>
      </div>
      <p className="owner-meta">{range.from.toISOString().slice(0, 10)} to {range.to.toISOString().slice(0, 10)} (exclusive), UTC. {context.config.live ? "Live payments only." : "Sandbox payments only."}</p>
      <dl className="owner-metrics">
        <div><dt>Paid orders</dt><dd>{metrics.totals.orders.toLocaleString("en-US")}</dd></div>
        <div><dt>Gross captured</dt><dd>{money(metrics.totals.grossMinor)}</dd></div>
        <div><dt>Successful refunds</dt><dd>{money(metrics.totals.refundedMinor)}</dd></div>
        <div><dt>Net after refunds</dt><dd>{money(metrics.totals.netMinor)}</dd></div>
      </dl>
      <p className="owner-meta">Refunds are attributed to the original purchase date, even when refunded later. Net excludes Stripe fees and dispute deductions. Open or lost disputes: {money(metrics.totals.disputedMinor)}.</p>
      {metrics.latestSync ? <p className="owner-meta">Latest order sync: {metrics.latestSync}. Totals cover ingested or reconciled orders; incomplete historical imports are not implied to be complete.</p>
        : <p className="owner-notice">No orders have been recorded in this ledger. These figures do not include any purchases that have not been imported.</p>}
      <div className="owner-table-wrap"><table><caption>Product sales</caption><thead><tr><th scope="col">Product</th><th scope="col">Paid purchases</th><th scope="col">Gross captured</th></tr></thead>
        <tbody>{metrics.products.length ? metrics.products.map(product => <tr key={product.product}><th scope="row">{product.product}</th><td>{product.sales}</td><td>{money(product.grossMinor)}</td></tr>)
          : <tr><td colSpan={3}>No paid purchases in this reporting window.</td></tr>}</tbody></table></div>
      <div className="owner-table-wrap"><table><caption>{range.interval === "day" ? "Daily" : range.interval === "week" ? "Weekly" : "Monthly"} revenue trend</caption><thead><tr><th scope="col">Period starts (UTC)</th><th scope="col">Purchases</th><th scope="col">Gross</th><th scope="col">Refunds</th><th scope="col">Net</th></tr></thead>
        <tbody>{metrics.trend.length ? metrics.trend.map(point => <tr key={point.period}><th scope="row">{point.period}</th><td>{point.sales}</td><td>{money(point.grossMinor)}</td><td>{money(point.refundedMinor)}</td><td>{money(point.netMinor)}</td></tr>)
          : <tr><td colSpan={5}>No paid purchases in this reporting window.</td></tr>}</tbody></table></div>
    </section>
    <section className="owner-traffic" aria-labelledby="traffic-title"><p className="owner-kicker">Audience</p><h2 id="traffic-title">Traffic & conversion</h2>
      <p>Visitor and page-view reporting is unavailable until the analytics connection is configured. Purchase conversion cannot be calculated without a measured visitor count.</p></section>
  </>;
}
