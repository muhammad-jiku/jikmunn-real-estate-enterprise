import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in or Create an account — Rentiful',
  description:
    'Sign in to Rentiful to manage properties, applications and view your dashboard. or Create an account on Rentiful to list properties or apply for rentals.',
  openGraph: {
    title: 'Sign in or Create an account — Rentiful',
    description:
      'Sign in to Rentiful to manage properties, applications and view your dashboard. or Create an account on Rentiful to list properties or apply for rentals.',
    // url: 'https://yourdomain.com/signin',
    siteName: 'Rentiful',
    type: 'website',
    // images: [
    //   {
    //     url: 'https://yourdomain.com/og-image.png',
    //     alt: 'Rentiful - Property Management',
    //   },
    // ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign in or Create an account — Rentiful',
    description:
      'Sign in to Rentiful to manage properties, applications and view your dashboard.',
    // images: ['https://yourdomain.com/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // Prevent sign-in page from being indexed
  robots: {
    index: false,
    follow: false,
  },
  // Optional canonical
  alternates: {
    // canonical: 'https://yourdomain.com/signin',
  },
};
