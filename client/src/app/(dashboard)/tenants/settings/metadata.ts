import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Tenant Settings - Rentiful',
  description:
    'Manage your tenant profile, payment methods, notification preferences and account security.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/tenants/settings`,
  },
};
