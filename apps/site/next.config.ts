import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.SITE_BASE_PATH ?? '',
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};
export default nextConfig;
