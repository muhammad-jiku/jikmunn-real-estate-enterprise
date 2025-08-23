import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Properties - Rentiful',
  description:
    'Manage all your property listings: edit details, view tenants, leases, payments, and application summaries.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/managers/properties`,
  },
};
