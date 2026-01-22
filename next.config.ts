  import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Allow mobile devices on same network to access dev server
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*'],
  
  // Allow external images from Appwrite Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fra.cloud.appwrite.io',
        port: '',
        pathname: '/v1/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloud.appwrite.io',
        port: '',
        pathname: '/v1/storage/**',
      },
    ],
  },
  
  // Increase body size limit for video uploads (default is 1MB)
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
