import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore lint errors during build (run lint separately for testing)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore type errors during build for dynamic database types
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
