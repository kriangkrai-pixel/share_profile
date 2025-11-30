import type { NextConfig } from "next";

// ตรวจสอบว่า deploy บน Cloudflare Pages หรือไม่
const isCloudflarePages = process.env.CF_PAGES === '1' || process.env.CF_PAGES_BRANCH;

const nextConfig: NextConfig = {
  // ใช้ 'export' สำหรับ Cloudflare Pages, 'standalone' สำหรับ Render/Node.js
  output: isCloudflarePages ? 'export' : 'standalone',
  trailingSlash: isCloudflarePages ? true : false,
  
  // Image Optimization
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      // รองรับ DigitalOcean Spaces (ข้อมูลเก่า)
      { protocol: 'https', hostname: 'internship.sgp1.digitaloceanspaces.com', pathname: '/**' },
      // รองรับ backend proxy endpoint (localhost สำหรับ development)
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/api/images/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001', pathname: '/api/images/**' },
      // รองรับ backend บน Render หรือ production
      { protocol: 'https', hostname: '*.onrender.com', pathname: '/api/images/**' },
    ],
  },
  
  // Compression
  compress: true,
  
  // Experimental Features for Performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;

