/** @type {import('next').NextConfig} */
// Security headers (X-Frame-Options, CSP, HSTS, Referrer-Policy,
// Permissions-Policy, nosniff) are set centrally in middleware.ts, which also
// handles per-route exceptions (e.g. embed-docs framing). Do not duplicate them here.
const nextConfig = {}

export default nextConfig
