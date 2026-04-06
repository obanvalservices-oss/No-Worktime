import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  // Safer tree-shaking for icon package (Next 15+)
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
