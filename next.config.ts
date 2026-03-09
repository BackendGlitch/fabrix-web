import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  cacheLife: {
    health: {
      stale: 30,
      revalidate: 60,
      expire: 300,
    },
  },
};

export default nextConfig;
