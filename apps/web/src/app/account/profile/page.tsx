import { redirect } from 'next/navigation';
import { accountContext } from '@/lib/account';
import { publicEnv } from '@/lib/env';
import { ProfileForm } from '@/components/forms';
import { PageIntro } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your profile' };
export default async function ProfilePage() {
  if (!publicEnv()) redirect('/auth/sign-in?next=/account/profile');
  const { profile, user, account } = await accountContext();
  const disabled = !!account && account.status !== 'active';
  return (
    <div className="container narrow">
      <PageIntro eyebrow="A LITTLE ABOUT YOU" title="The personal touches.">
        Your details, in one place.
      </PageIntro>
      <div className="panel">
        {disabled && (
          <p className="notice">
            Your account is {account?.status}. Profile editing is unavailable.
          </p>
        )}
        <ProfileForm
          profile={profile}
          email={user.email ?? ''}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
