import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Add New Property - Rentiful',
  description:
    'Create a new property listing: upload photos, add amenities and pricing, and publish to reach renters faster.',
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
      ) + '/managers/newproperty',
  },
};
