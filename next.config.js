/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // lightweight-charts ships ESM; transpile it for maximum compatibility.
  transpilePackages: ["lightweight-charts"],
  experimental: {
    // Allow larger server action payloads if you later stream big datasets.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
