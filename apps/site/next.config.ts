import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    tsconfigPath: process.env.NODE_ENV === 'development' ? 'tsconfig.json' : 'tsconfig.build.json',
  },
  basePath: process.env.SITE_BASE_PATH ?? '',
  env: { NEXT_PUBLIC_BASE_PATH: process.env.SITE_BASE_PATH ?? '' },
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};
export default nextConfig;
