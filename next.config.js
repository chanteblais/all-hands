/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is not configured in this project (same call as the camp repo).
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      // The board is the whole product for now. When All Hands grows a real app
      // shell, this redirect is the first thing to go.
      { source: '/', destination: '/kitchen.html', permanent: false },
    ];
  },
};

module.exports = nextConfig;
