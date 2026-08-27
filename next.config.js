/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is not configured in this project (same call as the camp repo).
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      // The board is the whole product for now. When All Hands grows a real app
      // shell, this redirect is the first thing to go.
      { source: '/', destination: '/kitchen', permanent: false },
      // Canonicalize the pre-2026-08-27 URL: old bookmarks land on /kitchen.
      // Redirects run before rewrites, so this can't loop with the one below.
      { source: '/kitchen.html', destination: '/kitchen', permanent: false },
    ];
  },
  async rewrites() {
    return [
      // /kitchen is the page's address; the file stays public/kitchen.html
      // (the no-build static surface — see docs/architecture.md). Array-form
      // rewrites apply after the filesystem check, so this serves the public
      // file internally with the clean URL in the bar.
      { source: '/kitchen', destination: '/kitchen.html' },
    ];
  },
};

module.exports = nextConfig;
