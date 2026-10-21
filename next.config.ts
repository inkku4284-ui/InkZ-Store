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
    }];
  }
};
export default config;
