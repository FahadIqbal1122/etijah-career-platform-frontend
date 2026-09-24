import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // The shop hub sends buyers back to /account/billing (BILLING_RETURN_URL in the backend),
  // which has no page — land them on the dashboard, where billing lives.
  async redirects() {
    return [{ source: '/account/billing', destination: '/dashboard?paid=1', permanent: false }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking protection — this app has login and billing-checkout redirects,
          // both worth keeping out of a hidden iframe.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
