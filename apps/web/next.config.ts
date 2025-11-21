import type { NextConfig } from "next";

import "./env/schema";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "public-files.web.garage.localhost",
        port: "3902",
        pathname: "/organizations/**",
      },
    ],
  },
};

export default nextConfig;
