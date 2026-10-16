"use client";
import Link from "next/link";
import { PageIntro, StatePanel } from "@/components/ui";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <><PageIntro index="STATUS / ERROR" eyebrow="Page unavailable" title="This page could not load."><p>A temporary error interrupted this view. No purchase or delivery is confirmed by this page.</p></PageIntro><div className="state-wrap shell"><StatePanel code="Try again" title="Return to a working page." actions={<><button className="button button-outline" type="button" onClick={retry}>Try again</button><Link className="text-link" href="/products">Browse products →</Link></>}><p>Retry this view, or return to the product collection. Current contact availability is listed on the support page.</p></StatePanel></div></>;
}
