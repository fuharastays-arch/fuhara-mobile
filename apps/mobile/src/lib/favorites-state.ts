export function updateFavoriteIds(
  current: ReadonlySet<string>,
  propertyId: string,
  saved: boolean,
) {
  const next = new Set(current);
  if (saved) next.add(propertyId);
  else next.delete(propertyId);
  return next;
}
