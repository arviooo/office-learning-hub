import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 15,
      static: 60,
    },
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
