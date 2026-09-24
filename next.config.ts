import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // The shop hub sends buyers back to {return_url}?order_ref=…&status=paid|failed, and the backend's
  // return_url is /account/billing, which has no page — send them to the dashboard, where billing lives.
  // Query values (order_ref, status) pass through to the destination. The locale-prefixed source is
  // needed too: the i18n proxy adds the locale before a redirect on the bare path can match.
  async redirects() {
    return [
      { source: '/account/billing', destination: '/dashboard', permanent: false },
      { source: '/:locale(en|ar)/account/billing', destination: '/:locale/dashboard', permanent: false },
    ]
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
