import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favorites - Rentiful',
  description:
    'Saved properties you liked — revisit listings, compare details, and contact managers quickly.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical:
      process.env.NEXT_PUBLIC_SITE_URL!.replace(
        //   (process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com').replace(
        /\/$/,
        ''
      ) + '/tenants/favorites',
  },
};
