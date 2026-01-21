  import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Allow mobile devices on same network to access dev server
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*'],
};

export default nextConfig;
