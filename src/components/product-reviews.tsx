"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./reviews.module.css";

type Review = { id: string; rating: number; displayName: string; body: string; createdAt: string; verified: true };
type ReviewPage = { reviews: Review[]; total: number; average: number | null; page: number; hasMore: boolean };

async function fetchReviews(product: string, page: number, signal?: AbortSignal): Promise<ReviewPage> {
  const response = await fetch(`/api/reviews?${new URLSearchParams({ product, page: String(page) })}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Unavailable");
  return response.json();
}

export function ProductReviews({ product = "combat-framework" }: { product?: string }) {
  const [data, setData] = useState<ReviewPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    fetchReviews(product, 1, abort.signal).then(result => {
      if (!abort.signal.aborted) { setData(result); setFailed(false); }
    }).catch(() => { if (!abort.signal.aborted) setFailed(true); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [product]);

  async function loadMore() {
    if (!data || loading) return;
    setLoading(true); setFailed(false);
    try {
      const next = await fetchReviews(product, data.page + 1);
      setData({ ...next, reviews: [...data.reviews, ...next.reviews.filter(row => !data.reviews.some(existing => existing.id === row.id))] });
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }

  return <section id="reviews" className={`shell ${styles.section}`} aria-labelledby="customer-reviews-heading">
    <div className={styles.heading}>
      <div><span className="mono">From the people building with it</span><h2 id="customer-reviews-heading">Customer reviews</h2></div>
      <p>Published reviews come from verified purchasers and are moderated before appearing here.</p>
    </div>
    {data ? <div className={styles.layout}>
      <aside className={styles.summary}>
        {data.average !== null && data.total > 0 ? <><strong className={styles.score}>{data.average.toFixed(1)} / 5</strong>
          <p>{data.total} approved {data.total === 1 ? "review" : "reviews"}</p></> : <p>No approved reviews yet.</p>}
        <p>Already own it? Open your download page to leave a review. No account needed.</p>
        <Link className="text-link" href="/recover">Recover your purchase ↗</Link>
      </aside>
      <div className={styles.list}>
        {data.reviews.map(review => <article key={review.id} className={styles.review}>
          <div className={styles.reviewTop}><span aria-label={`${review.rating} out of 5 stars`} className={styles.stars}>
            <span aria-hidden="true">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></span>
            <span className={styles.verified}>Verified purchase</span></div>
          <p className={styles.body}>{review.body}</p>
          <footer><strong>{review.displayName}</strong><time dateTime={review.createdAt}>{review.createdAt.slice(0, 10)}</time></footer>
        </article>)}
        {data.hasMore && <button className="button button-outline" onClick={loadMore} disabled={loading}>
          {loading ? "Loading reviews…" : "Load more reviews"}</button>}
      </div>
    </div> : null}
    <p role="status" className={styles.message}>{loading && !data ? "Loading customer reviews…" : failed ? "Reviews are not available right now." : ""}</p>
  </section>;
}
