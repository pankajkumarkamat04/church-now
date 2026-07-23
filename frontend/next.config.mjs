/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/dashboard/admin/donations', destination: '/dashboard/admin/payments', permanent: false },
      { source: '/dashboard/admin/tithes', destination: '/dashboard/admin/payments', permanent: false },
      { source: '/dashboard/admin/subscriptions', destination: '/dashboard/admin/payments', permanent: false },
      { source: '/dashboard/member/donations', destination: '/dashboard/member/payments', permanent: false },
      { source: '/dashboard/member/tithes', destination: '/dashboard/member/payments', permanent: false },
      { source: '/dashboard/member/subscriptions', destination: '/dashboard/member/payments', permanent: false },
      { source: '/dashboard/superadmin/donations', destination: '/dashboard/superadmin/payments', permanent: false },
      { source: '/dashboard/superadmin/tithes', destination: '/dashboard/superadmin/payments', permanent: false },
      { source: '/dashboard/superadmin/subscriptions', destination: '/dashboard/superadmin/payments', permanent: false },
      {
        source: '/dashboard/superadmin/pastor-terms',
        destination: '/dashboard/superadmin/pastor-management?tab=terms',
        permanent: false,
      },
      {
        source: '/dashboard/superadmin/finance/expenses/create',
        destination: '/dashboard/superadmin/finance/expenses',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
