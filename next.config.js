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
    // yahoo-finance2 uses dynamic requires; keep it out of the webpack bundle
    // and load it natively at runtime in the Node server (route handlers).
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
};

module.exports = nextConfig;
