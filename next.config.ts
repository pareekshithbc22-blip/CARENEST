import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone server for optimized Google Cloud Run deployment
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
      },
    },
  },
};

export default nextConfig;
