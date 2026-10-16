import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./globals.css";
import "./rework.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { business, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: { default: "INKZ® — Independent Software Label", template: "%s — INKZ®" },
  description: business.description,
  applicationName: "INKZ",
  openGraph: { type: "website", locale: "en_US", siteName: "INKZ®", title: "INKZ® — Built to be modified.", description: business.description },
  twitter: { card: "summary_large_image", title: "INKZ® — Built to be modified.", description: business.description },
};
export const viewport: Viewport = { themeColor: "#0B0B0C", colorScheme: "dark light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main" tabIndex={-1}>{children}</main><Footer/></body></html>;
}
