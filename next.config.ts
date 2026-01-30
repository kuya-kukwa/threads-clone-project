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
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
