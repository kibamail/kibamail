import type { NextConfig } from "next";

import "./env/schema";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: false,
  images: {
    remotePatterns: [
      // Backblaze B2 storage
      {
        protocol: "https",
        hostname: "*.backblazeb2.com",
      },
      // AWS S3
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      // Custom CDN domain (configure S3_PUBLIC_URL to use this)
      {
        protocol: "https",
        hostname: "cdn.kibamail.com",
      },
      // Local development (MinIO)
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
    ],
  },
  async rewrites() {
    const posthogRewrites = [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];

    if (process.env.API_REWRITE_MODE !== "true") {
      return posthogRewrites;
    }
    return [
      {
        source: "/:path+",
        destination: "/api/:path+",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
