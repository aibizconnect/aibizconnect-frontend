import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger media uploads through Server Actions (was the 1 MB default cap).
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
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
