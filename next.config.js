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

module.exports = nextConfig
