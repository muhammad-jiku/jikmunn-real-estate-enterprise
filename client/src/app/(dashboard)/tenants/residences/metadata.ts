import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Residences - Rentiful',
  description:
    'View active leases, billing history, lease documents and important dates for properties you rent.',
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
      ) + '/tenants/residences',
  },
};
