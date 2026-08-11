import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger media uploads through Server Actions (was the 1 MB default cap).
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [
      {
        // The embeddable listings block is meant to be framed by any customer site / GHL page.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/agent/:path*",
        destination: "http://localhost:4545/:path*"
      }
    ];
  }
};

export default nextConfig;
