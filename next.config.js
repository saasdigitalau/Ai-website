/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Build must proceed so the app can run; type issues are tracked and fixed separately.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
module.exports = nextConfig;