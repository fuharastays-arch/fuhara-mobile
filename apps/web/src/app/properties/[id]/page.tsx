import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPropertyId } from '@fuhara/core';
import { parseFilters } from '@fuhara/core/catalog';
import { getCatalog } from '@/lib/catalog';
import { CatalogUnavailable } from '@/components/catalog';
import { PropertyImage } from '@/components/property-image';
import { StayPlanner } from '@/components/stay-planner';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Explore a stay',
  robots: { index: false, follow: true },
};
export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isPropertyId(id)) notFound();
  const result = await getCatalog(parseFilters({}), id);
  if (!result.ok)
    return (
      <div className="container">
        <CatalogUnavailable href={`/properties/${id}`} />
      </div>
    );
  const p = result.data.items[0];
  if (!p) notFound();
  const photos = [
    ...(p.cover_image_url
      ? [{ url: p.cover_image_url, alt_text: p.title }]
      : []),
    ...p.images,
  ].filter(
    (img, index, all) => all.findIndex((i) => i.url === img.url) === index,
  );
  return (
    <div className="container property-detail">
      <Link className="back-link" href="/properties">
        ← Explore all stays
      </Link>
      <div className="detail-heading">
        <p className="eyebrow">
          APPROVED STAY · {p.property_type.replaceAll('_', ' ')}
        </p>
        <h1>{p.title}</h1>
        <p>{[p.area, p.city, p.state, p.country].filter(Boolean).join(', ')}</p>
      </div>
      <div className="property-gallery">
        <div className="gallery-cover">
          <PropertyImage
            src={photos[0]?.url ?? null}
            alt={photos[0]?.alt_text || p.title}
            eager
          />
        </div>
        {photos.length > 1 && (
          <div className="gallery-strip" aria-label="More property photos">
            {photos.slice(1).map((img, index) => (
              <div key={img.url}>
                <PropertyImage
                  src={img.url}
                  alt={img.alt_text || `${p.title}, photo ${index + 2}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="detail-columns">
        <div>
          <section className="detail-section">
            <h2>Room to settle in.</h2>
            <p className="property-facts">
              {p.max_guests} guests · {p.bedrooms} bedrooms · {p.bathrooms}{' '}
              bathrooms
            </p>
            <p className="property-description">
              {p.description ||
                'A description has not been provided for this stay yet.'}
            </p>
          </section>
          <section className="detail-section">
            <h2>The little comforts.</h2>
            {p.amenities.length ? (
              <ul className="amenity-list">
                {p.amenities.map((a) => (
                  <li key={a.code}>
                    <span aria-hidden="true">✓</span> {a.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Amenities have not been listed yet.</p>
            )}
          </section>
          <section className="detail-section">
            <h2>A sense of place.</h2>
            <p>{[p.area, p.city, p.state].filter(Boolean).join(', ')}</p>
            <p>Explore the neighbourhood while planning your stay.</p>
          </section>
        </div>
        <StayPlanner
          rateKobo={p.nightly_rate_kobo}
          maxGuests={p.max_guests}
          today={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </div>
  );
}
