import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output is only for Docker/Coolify — Vercel doesn't support it
  ...(process.env.STANDALONE === "true" ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["@aws-sdk/client-s3"],
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (isServer) {
      const existing = config.externals;
      const asArray = Array.isArray(existing) ? existing : existing ? [existing] : [];
      config.externals = [...asArray, /^@aws-sdk\//, /^@smithy\//];
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@atlaskit/pragmatic-drag-and-drop",
    "@atlaskit/pragmatic-drag-and-drop-hitbox",
    "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-ff056601d3a741689162675d72a994c7.r2.dev",
      },
    ],
  },
};

export default nextConfig;

