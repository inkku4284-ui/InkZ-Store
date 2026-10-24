import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReview } from "../../src/lib/reviews/validation";

test("review text is bounded plain text with an integer rating and no contact details", () => {
  const valid = { rating: 5, displayName: "Studio builder", body: "Easy to install and the combat feels responsive." };
  assert.deepEqual(validateReview(valid), valid);
  for (const change of [{ rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: "5" },
    { displayName: "a" }, { displayName: "x".repeat(41) }, { displayName: "buyer@example.com" },
    { body: "Too short" }, { body: "x".repeat(2001) }, { body: "<script>alert('hello')</script>" },
    { body: "Please visit https://spam.example for more information." },
    { body: "Email buyer@example.com for a free product now." },
    { body: "My order is cs_test_example1234567890 and it worked." },
    { displayName: "pi_customerpayment123" },
    { body: "My charge ch_example123456 was paid successfully." },
    { body: "Refund re_example123456 was successfully delivered." },
    { body: "Here is sk_live_secretfixture123456 please help me." },
    { body: "Webhook whsec_example123456 helped the setup work." },
    { body: "This product is great.\u0000 Please download it." }]) {
    assert.equal(validateReview({ ...valid, ...change }), null);
  }
});
