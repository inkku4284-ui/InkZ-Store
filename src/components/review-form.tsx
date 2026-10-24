"use client";

import { useState, type FormEvent } from "react";
import { validateReview } from "@/lib/reviews/validation";
import styles from "./reviews.module.css";

export function ReviewForm({ sessionId }: { sessionId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const input = validateReview({ rating: Number(form.get("rating")), displayName: form.get("display_name"), body: form.get("body") });
    if (!input) { setMessage("Choose 1–5 stars and write 20–2000 characters. Use a public name of 2–40 characters. Leave out links and contact details."); return; }
    setPending(true); setMessage("");
    try {
      const body = new URLSearchParams();
      for (const [key, value] of form) if (typeof value === "string") body.append(key, value);
      const response = await fetch("/api/reviews", { method: "POST", body, credentials: "same-origin", headers: { "content-type": "application/x-www-form-urlencoded" } });
      const result = await response.json();
      setMessage(typeof result.message === "string" ? result.message : "Your review could not be submitted. Please try again shortly.");
    } catch { setMessage("Your review could not be submitted. Please try again shortly."); }
    finally { setPending(false); }
  }

  return <section className={styles.formSection} aria-labelledby="write-review-heading">
    <span className="mono">Your experience</span><h2 id="write-review-heading">Leave a review</h2>
    <p>Your purchase is verified privately. Only your public name, rating and review appear after moderation. Editing a review sends it back for approval.</p>
    <form onSubmit={submit} action="/api/reviews" method="post" className={styles.form}>
      <input type="hidden" name="session_id" value={sessionId} />
      <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <fieldset className={styles.rating}><legend>Your rating</legend><div>{[1, 2, 3, 4, 5].map(rating => <label key={rating}>
        <input type="radio" name="rating" value={rating} required aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`} />
        <span aria-hidden="true">{rating} ★</span></label>)}</div></fieldset>
      <label className={styles.field}>Public name<input name="display_name" required minLength={2} maxLength={40} autoComplete="nickname" aria-describedby="review-name-note" /></label>
      <p id="review-name-note" className={styles.hint}>Use a nickname. Keep your email and payment details private.</p>
      <label className={styles.field}>Your review<textarea name="body" required minLength={20} maxLength={2000} rows={5} aria-describedby="review-body-note" /></label>
      <p id="review-body-note" className={styles.hint}>20–2000 characters. Tell other builders how it worked for you. No links or contact details.</p>
      <button className="button button-red" type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit for review"}</button>
      <p role="status" aria-live="polite" className={styles.message}>{message}</p>
    </form>
  </section>;
}
