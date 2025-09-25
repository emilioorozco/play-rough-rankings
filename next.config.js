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
    // ESLint enabled during builds to catch issues before deployment
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
