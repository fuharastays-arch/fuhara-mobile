import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { HostProperty } from '@fuhara/core/host';
import { ListingEditor } from '../../../components/listing-editor';
import { Button, Loading, Notice, Screen } from '../../../components/ui';
import { loadHostListing } from '../../../lib/api';
import { errorMessage } from '../../../lib/errors';
import { useSession } from '../../../lib/session';

type Availability = {
  id: string;
  start_date: string;
  end_date: string;
  source: string;
  note: string | null;
};

export default function ManageListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [property, setProperty] = useState<HostProperty | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await loadHostListing(id);
      const next = result.property as unknown as HostProperty;
      next.property_images.sort(
        (a, b) =>
          (a as HostProperty['property_images'][number] & { position?: number })
            .position! -
          (b as HostProperty['property_images'][number] & { position?: number })
            .position!,
      );
      setProperty(next);
      setAvailability(result.availability as Availability[]);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  if (loading) return <Loading label="Loading property…" />;
  if (!property || !user)
    return (
      <Screen>
        <Notice tone="error">{message || 'Property unavailable.'}</Notice>
        <Button kind="secondary" label="Try again" onPress={load} />
      </Screen>
    );
  if (property.status === 'suspended')
    return (
      <Screen>
        <Notice tone="warning">
          This property is suspended. Contact support before editing it.
        </Notice>
      </Screen>
    );
  return (
    <ListingEditor
      userId={user.id}
      property={property}
      availability={availability}
      onReload={load}
    />
  );
}
