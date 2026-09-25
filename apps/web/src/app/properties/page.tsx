import type { Metadata } from 'next';
import { PageIntro, EmptyState, ButtonLink } from '@/components/ui';
import { discoveryQuery } from '@fuhara/core';
export const metadata: Metadata = { title: 'Find a stay' };
export default async function Properties({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const query = discoveryQuery((await searchParams).destination);
  return (
    <div className="container">
      <PageIntro
        eyebrow="FIND YOUR PLACE"
        title={query ? `A stay in ${query}.` : 'Where will you feel at home?'}
      >
        A little escape. A longer chapter. Make yourself at home.
      </PageIntro>
      <form action="/properties" className="inline-search">
        <label className="sr-only" htmlFor="destination">
          City or neighbourhood
        </label>
        <input
          id="destination"
          name="destination"
          defaultValue={query}
          placeholder="City or neighbourhood"
          maxLength={80}
        />
        <button className="button">Explore</button>
      </form>
      <EmptyState title="Good things take a little care.">
        <p>
          Our first collection of stays is coming soon. There are no bookable
          properties to show here yet.
        </p>
        <p>Create your account and be ready for your next chapter.</p>
        <ButtonLink href="/auth/sign-up">Create an account</ButtonLink>
      </EmptyState>
    </div>
  );
}
