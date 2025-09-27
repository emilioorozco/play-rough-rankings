/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // keep strict; set true only temporarily
  },
  typedRoutes: true,
  eslint: {
    // ESLint enabled during builds to catch issues before deployment
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
