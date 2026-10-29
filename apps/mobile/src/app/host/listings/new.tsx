import { ListingEditor } from '../../../components/listing-editor';
import { Notice, Screen } from '../../../components/ui';
import { useSession } from '../../../lib/session';

export default function NewListing() {
  const { user } = useSession();
  if (!user)
    return (
      <Screen>
        <Notice tone="error">Sign in to create a property.</Notice>
      </Screen>
    );
  return <ListingEditor userId={user.id} />;
}
