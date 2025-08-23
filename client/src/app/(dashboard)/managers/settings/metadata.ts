import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Manager Settings - Rentiful',
  description:
    'Update your manager profile, contact details, security settings and notification preferences.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/managers/settings`,
  },
};
