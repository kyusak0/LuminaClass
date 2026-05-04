import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*', 
        destination: `${process.env.API_SERVER_URL}/:path*`, 
      },
    ];
  },
};

export default nextConfig;