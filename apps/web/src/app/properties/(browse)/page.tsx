import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/ui';
import {
  CatalogUnavailable,
  NoProperties,
  PropertyCard,
} from '@/components/catalog';
import { parseFilters, propertyTypes, catalogHref } from '@fuhara/core/catalog';
import { getCatalog } from '@/lib/catalog';
export const metadata: Metadata = { title: 'Find a stay' };
export const dynamic = 'force-dynamic';
export default async function Properties({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const result = await getCatalog(filters);
  return (
    <div className="container">
      <PageIntro
        eyebrow="FIND YOUR PLACE"
        title={
          filters.destination
            ? `A stay in ${filters.destination}.`
            : 'Where will you feel at home?'
        }
      >
        A little escape. A longer chapter. Make yourself at home.
      </PageIntro>
      <form action="/properties" className="catalog-filters">
        <label>
          City or neighbourhood
          <input
            name="destination"
            defaultValue={filters.destination}
            placeholder="Where to?"
            maxLength={80}
          />
        </label>
        <label>
          Guests
          <input
            name="guests"
            type="number"
            min={1}
            max={100}
            defaultValue={filters.guests}
          />
        </label>
        <label>
          Stay type
          <select name="type" defaultValue={filters.type}>
            <option value="">All stays</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          Max per night (₦)
          <input
            name="maxPrice"
            type="number"
            min={0}
            max={90071992547409}
            step={1}
            placeholder="Any budget"
            defaultValue={filters.maxRate === null ? '' : filters.maxRate / 100}
          />
        </label>
        <label>
          Sort by
          <select name="sort" defaultValue={filters.sort}>
            <option value="newest">Newest stays</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
          </select>
        </label>
        <button className="button">Explore</button>
        <Link href="/properties" className="reset-filters">
          Reset filters
        </Link>
      </form>
      <p className="caption">
        Approved stays · Prices in NGN · Availability must be confirmed
      </p>
      {!result.ok ? (
        <CatalogUnavailable href={catalogHref(filters)} />
      ) : result.data.items.length ? (
        <>
          <div className="results-heading">
            <p>{result.data.items.length} stays on this page</p>
            <span>Page {filters.page}</span>
          </div>
          <div className="property-grid">
            {result.data.items.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </>
      ) : (
        <NoProperties />
      )}
      {result.ok && (
        <nav className="pagination" aria-label="Catalog pages">
          {filters.page > 1 && (
            <Link
              className="button secondary"
              href={catalogHref(filters, filters.page - 1)}
            >
              Previous page
            </Link>
          )}
          {result.data.has_more && filters.page < 1000 && (
            <Link
              className="button"
              href={catalogHref(filters, filters.page + 1)}
            >
              Next page
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
