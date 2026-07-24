/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Optional same-origin /api → backend proxy (used when NEXT_PUBLIC_API_URL is empty).
    const backend = (process.env.BACKEND_PROXY_URL || 'http://localhost:5000').replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
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
