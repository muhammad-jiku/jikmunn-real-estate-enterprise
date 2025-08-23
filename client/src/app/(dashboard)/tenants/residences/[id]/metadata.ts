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
  let title = `Residence — Rentiful`;
  let description = `Residence details, lease and billing history.`;
  let image = `${SITE_URL}/og-image.png`;
  let url = `${SITE_URL}/tenants/residences/${id}`;

  try {
    const res = await fetch(`${API_BASE}/leases/${id}`, {
      next: { revalidate: 60 },
    });
    // try to fetch lease / residence info. If your API endpoint differs, change above.
    if (res.ok) {
      const lease = await res.json();
      // if lease contains property details:
      const property = lease?.property ?? lease;
      if (property) {
        title = `${property?.name ?? title} — Rentiful`;
        description =
          (property?.description && property.description.slice(0, 160)) ??
          description;
        image = (property?.photoUrls && property.photoUrls[0]) ?? image;
      }
    }
  } catch (e) {
    // ignore, fallback to defaults
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
      index: false, // tenant dashboard pages should not be indexed
      follow: false,
    },
  };
}
