import { redirect } from 'next/navigation';
import { accountContext } from '@/lib/account';
import { publicEnv } from '@/lib/env';
import { hostAccess } from '@fuhara/core';
import { PageIntro, ButtonLink } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your hosting journey' };
export default async function Onboarding() {
  if (!publicEnv()) redirect('/auth/sign-in?next=/host/onboarding');
  const { profile, account, host } = await accountContext('/host/onboarding');
  const verified = hostAccess(account, host);
  return (
    <div className="container narrow">
      <PageIntro
        eyebrow="YOUR HOSTING JOURNEY"
        title="Let’s make room for you."
      >
        Every great stay begins with a little preparation.
      </PageIntro>
      {account && account.status !== 'active' ? (
        <div className="notice">
          Your account is {account.status}. Hosting is currently unavailable.
        </div>
      ) : (
        <>
          <ol className="steps">
            <li>
              <span>01</span>
              <div>
                <h3>Your profile {profile && account ? '· Complete' : ''}</h3>
                <p>Tell us the essentials so we can get to know you.</p>
                <ButtonLink secondary href="/account/profile">
                  {profile ? 'Review profile' : 'Complete profile'}
                </ButtonLink>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Host verification</h3>
                <p>
                  {host
                    ? `Current verification status: ${host.kyc_status.replace('_', ' ')}.`
                    : 'Applications are coming soon. Your account does not yet have a host application.'}
                </p>
                {host?.kyc_status === 'rejected' && (
                  <p>
                    Your verification needs further review before you can host.
                  </p>
                )}
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Your first listing</h3>
                <p>
                  {verified
                    ? 'Your account is eligible to host. Listing tools are coming next.'
                    : 'Property submission becomes available after host approval and verification.'}
                </p>
              </div>
            </li>
          </ol>
          <div className="notice">
            No host application is submitted from this page yet. Your progress
            reflects your existing Fuhara account.
          </div>
        </>
      )}
    </div>
  );
}
