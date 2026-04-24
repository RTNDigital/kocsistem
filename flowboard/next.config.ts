import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
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

