import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // the encrypted product file ships with the download function (it is read from disk at request time)
  outputFileTracingIncludes: { "/api/download": ["./private/**/*"] },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ]
    }, {
      source: "/download",
      headers: [
        // Native same-origin POST forms need a non-null Origin. Cross-site
        // requests still receive no Referer; API/file responses stay no-referrer.
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "private, no-store" },
      ],
    }, {
      source: "/recover",
      headers: [
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "private, no-store" },
      ],
    }, {
      source: "/admin/:path*",
      headers: [
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "private, no-store" },
      ],
    }, {
      source: "/api/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }];
  }
};
export default config;
