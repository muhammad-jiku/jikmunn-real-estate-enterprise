/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Metadata } from 'next';

type Params = { id: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/$/, '');

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

// const SITE_URL = (
//   process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
// ).replace(/\/$/, '');
// const API_BASE =
//   process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || SITE_URL;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const id = params.id;
  let title = `Property — Rentiful`;
  let description = `Manage leases, tenants and payments for this property.`;
  let image = `${SITE_URL}/og-image.png`;
  let url = `${SITE_URL}/managers/properties/${id}`;

  try {
    const res = await fetch(`${API_BASE}/properties/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const property = await res.json();
      if (property) {
        title = `${property.name ?? title} — Rentiful`;
        description =
          (property.description && property.description.slice(0, 160)) ??
          description;
        image = (property.photoUrls && property.photoUrls[0]) ?? image;
      }
    }
  } catch (e) {
    // swallow - fall back to defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Rentiful',
      images: [{ url: image, alt: title, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: false, // dashboard pages should not be indexed
      follow: false,
    },
  };
}
