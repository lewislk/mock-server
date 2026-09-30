/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // Allow large request bodies for paste-import flows
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;