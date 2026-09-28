import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Diet PDFs are sent base64-encoded to the import server action.
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      // Vercel Blob uploads — the only image source. A wildcard host would
      // turn /_next/image into an open proxy billed to this project.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
