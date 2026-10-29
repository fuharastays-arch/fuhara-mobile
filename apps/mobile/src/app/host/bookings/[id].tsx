import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';
import { hostMoney } from '@fuhara/core/host';
import {
  Button,
  Card,
  Field,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  StatusPill,
  Subtitle,
  Title,
  textStyles,
} from '../../../components/ui';
import { decideHostBooking, loadHostBooking } from '../../../lib/api';
import { errorMessage, hostDecisionError } from '../../../lib/errors';
import { formatStayRange, hostBookingState } from '../../../lib/presentation';
import type { HostBookingDetail } from '../../../lib/types';

export default function HostBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<HostBookingDetail | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setBooking(await loadHostBooking(id));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  async function decide(decision: 'accept' | 'decline') {
    if (
      decision === 'decline' &&
      (reason.trim().length < 5 || reason.trim().length > 500)
    )
      return setMessage(
        'Provide a decline reason between 5 and 500 characters.',
      );
    setBusy(true);
    setMessage('');
    try {
      await decideHostBooking(id, decision, reason.trim() || null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (error) {
      setMessage(hostDecisionError(error));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading label="Loading booking request…" />;
  if (!booking)
    return (
      <Screen>
        <Notice tone="error">{message || 'Request not found.'}</Notice>
        <Button kind="secondary" label="Try again" onPress={load} />
      </Screen>
    );
  const bookingState = hostBookingState(booking.status);
  return (
    <Screen>
      <StatusPill tone={bookingState.tone}>{bookingState.label}</StatusPill>
      <Title>{booking.status === 'pending' ? 'Booking request' : booking.status === 'confirmed' ? 'Upcoming stay' : booking.property_name}</Title>
      <Subtitle>{booking.property_name} · Booking #{booking.booking_number}</Subtitle>
      {message ? <Notice tone="error">{message}</Notice> : null}
      <Notice tone={bookingState.tone === 'warning' ? 'warning' : 'info'}>
        {bookingState.title}. {bookingState.body}
      </Notice>
      <Card>
        <SectionTitle>Request details</SectionTitle>
        <Text style={textStyles.body}>
          {booking.guest_name} · {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
        </Text>
        <Text style={textStyles.body}>
          {formatStayRange(booking.check_in, booking.check_out)} ·{' '}
          {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
        </Text>
        <Text style={textStyles.body}>
          {hostMoney(booking.base_amount_kobo)} total
        </Text>
        <Text style={textStyles.body}>
          Payment: {['paid', 'settled'].includes(booking.payment_status) ? 'Paid' : 'Unavailable in beta'}
        </Text>
        <Text style={textStyles.body}>
          Projected payout: {hostMoney(booking.host_payout_kobo)}
        </Text>
        <Notice>
          Guest contact details remain private. Accepting reserves the dates;
          payment collection is unavailable in beta.
        </Notice>
        <Button
          kind="secondary"
          label="View property"
          onPress={() => router.push(`/host/listings/${booking.property_id}`)}
        />
      </Card>
      {booking.status === 'pending' ? (
        <Card>
          <SectionTitle>Respond</SectionTitle>
          <Button
            label={busy ? 'Saving…' : 'Accept and reserve dates'}
            onPress={() => decide('accept')}
            disabled={busy}
          />
          <Field
            label="Decline reason"
            value={reason}
            onChangeText={setReason}
            multiline
            hint="Required for a decline; 5–500 characters."
          />
          <Button
            kind="danger"
            label="Decline request"
            onPress={() => decide('decline')}
            disabled={busy}
          />
        </Card>
      ) : (
        <Notice>This request can no longer be accepted or declined.</Notice>
      )}
    </Screen>
  );
}
