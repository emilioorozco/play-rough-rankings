/** @type {import('next').NextConfig} */
const nextConfig = {
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
