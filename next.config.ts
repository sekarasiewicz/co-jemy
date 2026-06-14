import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Diet PDFs are sent base64-encoded to the import server action.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
