import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@valuation-os/types', '@valuation-os/utils', '@valuation-os/api'],
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
}

export default config
