import { PageIntro, ButtonLink } from '@/components/ui';
export const metadata = { title: 'Host with Fuhara' };
export default function Host() {
  return (
    <div className="container">
      <PageIntro
        eyebrow="HOST WITH FUHARA"
        title="Open your doors to possibility."
      >
        A thoughtful space can become the start of someone’s favourite story.
      </PageIntro>
      <div className="two-column">
        <div className="panel forest">
          <h2>
            A warm welcome
            <br />
            starts with you.
          </h2>
          <p>
            Bring your space and your sense of hospitality. We’ll help you
            prepare for the journey.
          </p>
          <ButtonLink href="/host/onboarding">
            Start your hosting journey ↗
          </ButtonLink>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <div>
              <h3>Make it personal</h3>
              <p>Create your Fuhara account and complete your profile.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Build trust</h3>
              <p>
                Host verification comes before property submissions.
                Applications are coming soon.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Prepare your place</h3>
              <p>
                Listing tools will follow, with property review before
                publication.
              </p>
            </div>
          </li>
        </ol>
      </div>
      <p className="caption">
        Already a host? Sign in with your existing Fuhara email to see your
        verification status.
      </p>
    </div>
  );
}
