/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // keep strict; set true only temporarily
  },
  experimental: {
    typedRoutes: true,
    // Enable React experimental features
    reactCompiler: false, // Keep disabled for now to avoid conflicts
  },
  eslint: {
    // Temporarily disable ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
