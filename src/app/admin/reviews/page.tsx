import Link from "next/link";
import { requireOwner } from "@/lib/admin/auth";
import { reviewsConfig } from "@/lib/reviews/config";
import { reviewsService } from "@/lib/reviews/runtime";
import type { ReviewStatus } from "@/lib/reviews/service";
import "./reviews.css";

export default async function ReviewModeration({ searchParams }: { searchParams: Promise<{ status?: string; result?: string }> }) {
  const owner = await requireOwner();
  if (!owner) return <section className="owner-access"><h1>Owner access required.</h1><p>Sign in before opening the review queue.</p><Link href="/admin">Owner sign-in</Link></section>;
  const params = await searchParams;
  const status: ReviewStatus = params.status === "approved" || params.status === "rejected" ? params.status : "pending";
  const config = reviewsConfig();
  let queue: Awaited<ReturnType<ReturnType<typeof reviewsService>["ownerList"]>> | null = null;
  if (config) try { queue = await reviewsService(config).ownerList(status); } catch { /* Private operational failure. */ }
  return <>
    <header className="owner-heading"><div><p className="owner-kicker">InkZ / Private studio</p><h1>Review moderation.</h1><p>Publish only the exact revision you have reviewed.</p></div><Link href="/admin">Store overview</Link></header>
    <nav className="owner-nav" aria-label="Review status">{(["pending", "approved", "rejected"] as const).map(value => <Link key={value} href={`/admin/reviews?status=${value}`} aria-current={status === value ? "page" : undefined}>{value[0].toUpperCase() + value.slice(1)}</Link>)}</nav>
    {params.result === "saved" && <p className="owner-notice" role="status">Review decision saved.</p>}
    {params.result === "stale" && <p className="owner-notice" role="status">This review changed or is no longer available. Read the current version before deciding.</p>}
    {queue === null ? <p className="owner-notice">Reviews are not configured or are temporarily unavailable.</p>
      : queue.length === 0 ? <p>No {status} reviews.</p> : <><p className="owner-meta">Showing up to 100 {status} reviews, most recently updated first. Approved reviews appear publicly only while the recorded purchase entitlement is active.</p>
      <div className="owner-review-list">{queue.map(review => <article className="owner-review" key={review.id}>
        <p className="owner-kicker">{review.product} / {review.rating} of 5 stars / Revision {review.revision}</p>
        <h2>{review.displayName}</h2><p className="owner-review-body">{review.body}</p>
        <p className="owner-meta">Purchase entitlement: {review.entitlement}. Updated {review.updatedAt.toISOString().slice(0, 10)} UTC.</p>
        <form action="/api/admin/reviews" method="post"><input type="hidden" name="id" value={review.id}/><input type="hidden" name="revision" value={review.revision}/>
          <button type="submit" className="owner-button" name="decision" value="approved">Approve revision {review.revision}</button>{" "}
          <button type="submit" className="owner-text-button" name="decision" value="rejected">Reject</button>
        </form>
      </article>)}</div></>}
  </>;
}
