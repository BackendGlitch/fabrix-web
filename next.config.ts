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
  async rewrites() {
    return [
      {
        source: '/api/central/:path*',
        destination: 'https://api-fabrix-v2.backendglitch.com/:path*',
      },
    ];
  },
};

export default nextConfig;
