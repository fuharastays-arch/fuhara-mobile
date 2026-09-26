'use client';
export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <div className="container">
      <div className="empty" role="alert">
        <h1>We couldn’t load this stay.</h1>
        <p>Please try again in a moment.</p>
        <button className="button" onClick={reset}>
          Try again
        </button>
        <p>
          <a href="/properties">Explore all stays</a>
        </p>
      </div>
    </div>
  );
}
