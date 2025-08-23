import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Properties - Rentiful',
  description:
    'Manage all your property listings: edit details, view tenants, leases, payments, and application summaries.',
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
      ) + '/managers/properties',
  },
};
