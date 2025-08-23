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
  const url = `${SITE}/search/${id}`;
  let title = `Property Listing — Rentiful`;
  let description = `View this property on Rentiful.`;
  let image = DEFAULT_OG;

  if (API_BASE) {
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
    } catch (err) {
      // intentionally swallow errors — fall back to defaults
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
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
    },
    viewport: 'width=device-width, initial-scale=1',
  };
}
