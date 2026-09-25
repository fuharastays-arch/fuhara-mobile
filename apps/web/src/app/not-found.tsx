import { ButtonLink, PageIntro } from '@/components/ui';
export default function NotFound() {
  return (
    <div className="container narrow">
      <PageIntro eyebrow="A SMALL DETOUR" title="This place isn’t available.">
        The page may have moved, or this stay is not available to explore yet.
      </PageIntro>
      <ButtonLink href="/properties">Explore stays</ButtonLink>
    </div>
  );
}
