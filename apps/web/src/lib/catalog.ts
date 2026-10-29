import 'server-only';
import { publicEnv } from './env';
import {
  parseCatalog,
  type CatalogFilters,
  type CatalogPage,
} from '@fuhara/core/catalog';
export type CatalogResult =
  | { ok: true; data: CatalogPage }
  | { ok: false; reason: 'unavailable' };
// Always anonymous, regardless of the viewer's account or staff cookies.
export async function getCatalog(
  filters: CatalogFilters,
  id?: string,
): Promise<CatalogResult> {
  try {
    const env = publicEnv();
    if (!env) return { ok: false, reason: 'unavailable' };
    const response = await fetch(`${env.url}/rest/v1/rpc/product_catalog_v1`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: {
        apikey: env.key,
        ...(env.key.startsWith('sb_publishable_')
          ? {}
          : { Authorization: `Bearer ${env.key}` }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_destination: filters.destination,
        p_guests: filters.guests,
        p_type: filters.type,
        p_max_rate: filters.maxRate,
        p_sort: filters.sort,
        p_page: filters.page,
        p_id: id ?? null,
      }),
    });
    if (!response.ok) {
      console.warn('Catalog unavailable', { status: response.status });
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: true, data: parseCatalog(await response.json()) };
  } catch {
    console.warn(
      'Catalog unavailable: network, configuration or contract failure',
    );
    return { ok: false, reason: 'unavailable' };
  }
}
