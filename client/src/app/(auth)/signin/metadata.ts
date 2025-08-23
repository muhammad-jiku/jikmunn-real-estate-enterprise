import type { Metadata } from 'next';

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Sign in or Create an account — Rentiful',
  description:
    'Sign in to Rentiful to manage properties, applications and view your dashboard. Or create an account to list properties or apply for rentals.',
  openGraph: {
    title: 'Sign in or Create an account — Rentiful',
    description:
      'Sign in to Rentiful to manage properties, applications and view your dashboard.',
    siteName: 'Rentiful',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign in or Create an account — Rentiful',
    description: 'Sign in to Rentiful to manage properties and applications.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE}/signin`,
  },
};
