import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Favorites - Rentiful',
  description:
    'Saved properties you liked — revisit listings, compare details, and contact managers quickly.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/tenants/favorites`,
  },
};
