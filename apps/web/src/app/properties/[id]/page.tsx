import { notFound } from 'next/navigation';
import { isPropertyId } from '@fuhara/core';
// Public property access is intentionally closed until the reviewed catalog contract exists.
// Never use a staff session or service key to fill this public route.
export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isPropertyId(id)) notFound();
  notFound();
}
