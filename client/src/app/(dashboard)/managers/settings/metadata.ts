import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manager Settings - Rentiful',
  description:
    'Update your manager profile, contact details, security settings and notification preferences.',
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
      ) + '/managers/settings',
  },
};
