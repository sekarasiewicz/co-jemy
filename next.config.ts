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
      // Vercel Blob uploads
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Meal images can also be arbitrary user-pasted URLs
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
