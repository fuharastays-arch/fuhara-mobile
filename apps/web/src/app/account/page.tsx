import { redirect } from 'next/navigation';
import { accountContext } from '@/lib/account';
import { publicEnv } from '@/lib/env';
import { signOut } from '@/lib/actions';
import { PageIntro, ButtonLink } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your account' };
export default async function AccountPage() {
  if (!publicEnv()) redirect('/auth/sign-in');
  const { profile, account, user } = await accountContext();
  return (
    <div className="container">
      <PageIntro
        eyebrow="YOUR FUHARA"
        title={
          profile ? `Welcome, ${profile.first_name}.` : 'Make yourself at home.'
        }
      >
        {user.email}
      </PageIntro>
      {account && account.status !== 'active' && (
        <p className="notice">
          Your account is {account.status}. Account changes and hosting are
          unavailable.
        </p>
      )}
      <div className="account-grid">
        <section className="panel">
          <p className="eyebrow">THE ESSENTIALS</p>
          <h2>Your profile</h2>
          <p>
            {profile && account
              ? 'Keep your details up to date.'
              : 'Complete your profile to finish account setup.'}
          </p>
          <ButtonLink href="/account/profile" secondary>
            {profile ? 'View profile' : 'Complete your profile'}
          </ButtonLink>
        </section>
        <section className="panel">
          <p className="eyebrow">SOMETHING TO LOOK FORWARD TO</p>
          <h2>Your stays</h2>
          <p>Booking and trip management are coming soon.</p>
          <ButtonLink href="/properties" secondary>
            Explore destinations
          </ButtonLink>
        </section>
        <section className="panel">
          <p className="eyebrow">OPEN NEW DOORS</p>
          <h2>
            {account?.is_host ? 'Your hosting journey' : 'Share your space'}
          </h2>
          <p>Review your profile and host verification progress.</p>
          <ButtonLink href="/host/onboarding" secondary>
            Explore hosting
          </ButtonLink>
        </section>
      </div>
      <form action={signOut} className="signout-form">
        <button className="text-button">Sign out of this app</button>
      </form>
    </div>
  );
}
