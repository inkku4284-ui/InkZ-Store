import Link from "next/link";

const questions = [
  ["Can I buy a framework yet?", <>Not yet. Combat Framework has not launched. Pricing, payment processing, and delivery are still being finalized. The site does not accept payments.</>],
  ["What does the license allow?", <>License rights are not yet finalized. Commercial use, project limits, team access, redistribution, and modification rights must be published before sales open. See <Link href="/terms">terms & licensing</Link>.</>],
  ["How will the software be delivered?", <>Digital delivery is planned. No download or delivery timing is promised at this stage. The delivery process will be documented and tested before purchasing is enabled.</>],
  ["Will it work with my Roblox project?", <>Roblox Studio and Luau are the target platform and language. Specific versions, dependencies, rig types, and integration requirements have not been verified. Read the <Link href="/docs#compatibility">compatibility notes</Link> before making plans around the framework.</>],
  ["What about support and updates?", <>A public support channel and support scope are being prepared. Update frequency and duration have not been set. No lifetime updates or permanent support are promised. Current status is on the <Link href="/contact">contact page</Link>.</>],
  ["What is the refund policy?", <>There are currently no sales. Eligibility, the request process, and any digital-content consent requirements will be published before launch. Applicable consumer rights still apply. Read the <Link href="/refund-policy">refund policy</Link>.</>],
] as const;

export function Faq() {
  return <div className="faq-list">{questions.map(([question, answer], index) => <details key={question}><summary><span className="mono faq-index">0{index + 1}</span><span>{question}</span><span className="faq-plus" aria-hidden="true"/></summary><div className="faq-answer">{answer}</div></details>)}</div>;
}
