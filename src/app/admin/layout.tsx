import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Owner studio",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="owner-studio">{children}</div>;
}
