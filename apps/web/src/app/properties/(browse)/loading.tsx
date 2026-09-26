export default function Loading() {
  return (
    <div className="container" role="status" aria-live="polite">
      <p className="eyebrow">FIND YOUR PLACE</p>
      <h1>A little closer to your next stay.</h1>
      <p>Loading stays…</p>
      <div className="property-grid" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <div className="catalog-skeleton" key={i} />
        ))}
      </div>
    </div>
  );
}
