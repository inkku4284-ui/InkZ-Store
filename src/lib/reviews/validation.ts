export type ReviewInput = { rating: number; displayName: string; body: string };
export function validateReview(value: unknown): ReviewInput | null {
  if (!value || typeof value !== "object") return null;
  const { rating, displayName, body } = value as Record<string, unknown>;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
    typeof displayName !== "string" || typeof body !== "string") return null;
  const name = displayName.trim(), text = body.trim();
  // Public text has no markup, links, email addresses, or invisible control characters.
  const unsafe = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]|https?:|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
  const paymentOrKey = /\b(?:cs_(?:test|live)_[A-Za-z0-9]+|(?:pi|ch|re|price|cus|evt|pm|txn|in)_[A-Za-z0-9]{4,}|(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+)\b/i;
  if (name.length < 2 || name.length > 40 || text.length < 20 || text.length > 2000 ||
    unsafe.test(name) || unsafe.test(text) || paymentOrKey.test(name) || paymentOrKey.test(text)) return null;
  return { rating, displayName: name, body: text };
}
