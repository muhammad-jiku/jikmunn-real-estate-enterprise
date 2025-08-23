import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'My Applications - Rentiful',
  description:
    'Track your rental application statuses, view messages from managers, and see next steps in one place.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/tenants/applications`,
  },
};
