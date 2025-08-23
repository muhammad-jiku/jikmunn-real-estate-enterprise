import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Applications - Rentiful',
  description:
    'View and manage rental applications for your properties — review applicants, message them, and approve or deny quickly.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/managers/applications`,
  },
};
