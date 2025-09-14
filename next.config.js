/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    // Enable React experimental features
    reactCompiler: false, // Keep disabled for now to avoid conflicts
  },
}

module.exports = nextConfig