import Link from 'next/link';
import { money, type CatalogProperty } from '@fuhara/core/catalog';
import { PropertyImage } from './property-image';
import { EmptyState, ButtonLink } from './ui';
export function CatalogUnavailable({
  href = '/properties',
}: {
  href?: string;
}) {
  return (
    <EmptyState title="Our stays are temporarily unavailable.">
      <p>
        We couldn’t load the collection. Please try again in a little while.
      </p>
      <a className="button" href={href}>
        Try again
      </a>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </EmptyState>
  );
}
export function PropertyCard({ property: p }: { property: CatalogProperty }) {
  return (
    <article className="property-card">
      <Link href={`/properties/${p.id}`}>
        <div className="card-photo">
          <PropertyImage
            src={p.cover_image_url ?? p.images[0]?.url ?? null}
            alt={p.title}
          />
          <span className="property-badge">Approved stay</span>
        </div>
        <div className="card-copy">
          <p className="eyebrow">
            {[p.area, p.city].filter(Boolean).join(' · ')}
          </p>
          <h2>{p.title}</h2>
          <p>
            {p.max_guests} guests · {p.bedrooms} bedrooms · {p.bathrooms}{' '}
            bathrooms
          </p>
          <div className="card-price">
            <strong>{money(p.nightly_rate_kobo)}</strong>
            <span> / night</span>
            <span aria-hidden="true"> ↗</span>
          </div>
          <small>Dates and availability to be confirmed</small>
        </div>
      </Link>
    </article>
  );
}
export function NoProperties() {
  return (
    <EmptyState title="A little more room to explore.">
      <p>
        No stays match these filters. Try a nearby city, fewer guests or a
        different budget.
      </p>
      <ButtonLink href="/properties" secondary>
        Clear filters
      </ButtonLink>
    </EmptyState>
  );
}
