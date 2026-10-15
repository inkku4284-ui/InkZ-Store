import { sandboxConfig } from "../src/lib/stripe/config";
import { stripeClient, verifiedPrice } from "../src/lib/stripe/core";

async function main() {
  const config = sandboxConfig();
  if (!config) {
    console.error("Sandbox configuration incomplete or unsafe. See STRIPE_SANDBOX.md; no request sent.");
    process.exitCode = 1;
  } else {
    try {
      const price = await verifiedPrice(stripeClient(config), config);
      console.log(JSON.stringify({ id: price.id, product: typeof price.product === "object" ? price.product.id : price.product, livemode: price.livemode, currency: price.currency, unit_amount: price.unit_amount, verified: true }, null, 2));
    } catch {
      console.error("Stripe Price verification failed. Check Sandbox credentials, product, amount, currency, and network access. No checkout created.");
      process.exitCode = 1;
    }
  }

}
void main();
