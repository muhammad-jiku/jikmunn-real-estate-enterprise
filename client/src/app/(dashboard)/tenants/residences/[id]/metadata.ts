/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Metadata } from 'next';

type Params = { id: string };

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
).replace(/\/$/, '');
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const DEFAULT_OG = `${SITE}/og-image.png`;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const id = params.id;
  const url = `${SITE}/tenants/residences/${id}`;
  let title = `Residence — Rentiful`;
  let description = `Residence details, lease and billing history.`;
  let image = DEFAULT_OG;

  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/leases/${id}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const lease = await res.json();
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
      // fallback
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Rentiful',
      images: [
        {
          url: image,
          alt: title,
          width: 1200,
          height: 630,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
    robots: {
      index: false,
      follow: false,
    },
  };
}
