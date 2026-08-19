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
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: "1036720648609-5qd5pd39068lokenpvg25hl25hjt0pm8.apps.googleusercontent.com",
  },
};

export default nextConfig;
