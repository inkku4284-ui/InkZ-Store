import Link from "next/link";
import { combat } from "@/lib/products";
import { business } from "@/lib/site";

const questions = [
  ["Can I buy it yet?", <>Combat Framework costs {combat.price}, one-time. Sales open soon: the buy button switches on at launch. The <Link href="/docs">install guide</Link> is already public.</>],
  ["What does the license allow?", <>Use and modify it in any number of your own Roblox games, paid ones included. No reselling, sharing or redistributing. See <Link href="/terms#license">terms & licensing</Link>.</>],
  ["How is it delivered?", <>{combat.delivery} Pay with a card or PromptPay through Stripe.</>],
  ["Will it work with my game?", <>It is built for R6: the package makes every player R6 automatically while keeping their own avatar look. It installs with one line and checks your place for you. R15 is not supported. Read the <Link href="/docs#install">install guide</Link>.</>],
  ["What about support and updates?", <>Add {business.supportDiscord} on Discord. Fixes to version 1 are free for buyers. See the <Link href="/contact">contact page</Link>.</>],
  ["What is the refund policy?", <>Charged twice, no working download, or a problem that can&apos;t be fixed within 7 days: full refund. Read the <Link href="/refund-policy">refund policy</Link>.</>],
] as const;

export function Faq() {
  return <div className="faq-list">{questions.map(([question, answer], index) => <details key={question}><summary><span className="mono faq-index">0{index + 1}</span><span>{question}</span><span className="faq-plus" aria-hidden="true"/></summary><div className="faq-answer">{answer}</div></details>)}</div>;
}
