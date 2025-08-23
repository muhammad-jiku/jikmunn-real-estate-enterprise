import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tenant Settings - Rentiful',
  description:
    'Manage your tenant profile, payment methods, notification preferences and account security.',
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
      ) + '/tenants/settings',
  },
};
