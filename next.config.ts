import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    domains: ['tduigpippkirfyplicsk.supabase.co']
  }
};

export default nextConfig;
