/** @type {import('next').NextConfig} */
// Security headers (X-Frame-Options, CSP, HSTS, Referrer-Policy,
// Permissions-Policy, nosniff) are set centrally in middleware.ts, which also
// handles per-route exceptions (e.g. embed-docs framing). Do not duplicate them here.
const nextConfig = {
  // three.js post-processing addons (three/examples/jsm/*) ship as ESM that
  // imports from 'three'; transpiling the package keeps the prod build happy.
  transpilePackages: ['three'],
}

export default nextConfig
