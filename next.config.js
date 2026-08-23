/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: false,
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}
module.exports = nextConfig
