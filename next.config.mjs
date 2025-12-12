/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },

  // ✅ Disable ESLint only during production builds (NO IMPACT on local dev)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
