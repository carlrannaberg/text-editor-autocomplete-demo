/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Strict TypeScript checking
  },
  eslint: {
    ignoreDuringBuilds: false, // Strict ESLint checking
  },
  env: {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
};

module.exports = nextConfig;