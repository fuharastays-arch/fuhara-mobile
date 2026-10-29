'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container narrow">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>A little interruption.</h1>
      <p>We couldn’t load this page. Please try again in a moment.</p>
      <button className="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
