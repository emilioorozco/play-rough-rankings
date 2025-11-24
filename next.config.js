/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // keep strict; set true only temporarily
  },
  typedRoutes: true,
  eslint: {
    // Default directories to lint during production builds
    dirs: ['pages', 'components', 'lib', 'src', 'app'],
  },
}

// Allow cross-origin requests from specific dev origins (e.g., ngrok tunnels)
// Set NEXT_PUBLIC_ALLOWED_DEV_ORIGINS env var to specify allowed origins
// This will be required in future major versions of Next.js
if (process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS) {
  nextConfig.allowedDevOrigins = process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

module.exports = nextConfig
