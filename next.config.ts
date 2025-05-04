import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverRuntimeConfig: {
    maxDuration: 60, // 60 seconds
  },
  // Configure Playwright for serverless environment
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Playwright browser binaries from the server bundle
      config.externals.push({
        'playwright-core': 'playwright-core',
      })
    }
    return config
  },
};

export default nextConfig;
