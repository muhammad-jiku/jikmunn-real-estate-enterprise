import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Search Properties — Rentiful',
  description:
    'Search rental properties by location, price, amenities and more. Filter results, view photos and contact managers instantly.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SITE}/search`,
  },
};
