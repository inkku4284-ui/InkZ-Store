/** A bounded, single mailbox. The actual authority is Stripe's receipt address. */
export function normalizeReceiptEmail(value: string): string | null {
  if (value.length > 254 || /[\r\n\0]/.test(value)) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s<>()[\]\\,;:"@]+@[a-z0-9.-]+\.[a-z]{2,63}$/i.test(email) ? email : null;
}
