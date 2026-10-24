import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { business, siteUrl } from "@/lib/site";
import { InkzAnalytics } from "@/components/analytics";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: { default: "INKZ® — Independent Software Label", template: "%s — INKZ®" },
  description: business.description,
  applicationName: "INKZ",
  openGraph: { type: "website", locale: "en_US", siteName: "INKZ®", title: "INKZ® — INKZ IS LABEL.", description: business.description },
  twitter: { card: "summary_large_image", title: "INKZ® — INKZ IS LABEL.", description: business.description },
};
export const viewport: Viewport = { themeColor: "#0A0A0B", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main" tabIndex={-1}>{children}</main><Footer/><Suspense fallback={null}><InkzAnalytics enabled={process.env.INKZ_ANALYTICS_COLLECTION === "vercel" && process.env.VERCEL_ENV === "production"}/></Suspense></body></html>;
}
