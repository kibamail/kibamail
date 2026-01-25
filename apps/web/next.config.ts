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
  // Rewrite all paths to /api/* when API_REWRITE_MODE is enabled
  // Used for api.kibamail.com subdomain deployment
  async rewrites() {
    if (process.env.API_REWRITE_MODE !== "true") {
      return [];
    }
    return [
      {
        source: "/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};

export default nextConfig;
