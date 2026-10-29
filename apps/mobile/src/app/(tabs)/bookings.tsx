import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { RefreshControl, Text } from 'react-native';
import { money } from '@fuhara/core/catalog';
import {
  Button,
  Card,
  Empty,
  Eyebrow,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  StatusPill,
  Subtitle,
  Title,
  textStyles,
} from '../../components/ui';
import { loadMyBookings } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatStayRange, guestBookingState } from '../../lib/presentation';
import { useSession } from '../../lib/session';
import type { Booking } from '../../lib/types';
import { colors } from '../../theme';

function TripCard({ booking }: { booking: Booking }) {
  const state = guestBookingState(booking.status, booking.payment_status, false);
  return (
    <Card>
      <StatusPill tone={state.tone}>{state.label}</StatusPill>
      <SectionTitle>{booking.property_name}</SectionTitle>
      <Text style={textStyles.body}>
        {formatStayRange(booking.check_in, booking.check_out)} · {booking.nights}{' '}
        {booking.nights === 1 ? 'night' : 'nights'}
      </Text>
      <Text style={textStyles.body}>
        {money(Number(booking.guest_total_kobo || booking.base_amount_kobo))} ·{' '}
        {['paid', 'settled'].includes(booking.payment_status || '')
          ? 'Paid'
          : 'Payment unavailable in beta'}
      </Text>
      <Notice tone={state.tone === 'warning' ? 'warning' : 'info'}>{state.body}</Notice>
      <Button kind="secondary" label="View booking" onPress={() => router.push(`/booking/${booking.booking_id}`)} />
    </Card>
  );
}

export default function Bookings() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(
    async (refresh = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setMessage('');
      try {
        setItems((await loadMyBookings()).items);
      } catch (error) {
        setMessage(errorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  if (sessionLoading || loading) return <Loading label="Loading your trips…" />;
  if (!user)
    return (
      <Screen>
        <Eyebrow>YOUR TRIPS</Eyebrow>
        <Title>Keep every stay in view.</Title>
        <Subtitle>
          Sign in to request stays and follow every booking update.
        </Subtitle>
        <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />
      </Screen>
    );
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.teal}
        />
      }
    >
      <Eyebrow>YOUR TRIPS</Eyebrow>
      <Title>Bookings</Title>
      <Subtitle>
        Upcoming plans and past stays in one place.
      </Subtitle>
      {message ? <Notice tone="error">{message}</Notice> : null}
      {!items.length ? (
        <Empty
          title="No bookings yet"
          body="When you request an Abuja stay, it will appear here."
          action={
            <Button
              kind="secondary"
              label="Explore stays"
              onPress={() => router.push('/(tabs)')}
            />
          }
        />
      ) : <>
        <SectionTitle>Upcoming</SectionTitle>
        {items.filter((booking) => ['pending', 'confirmed', 'checked_in'].includes(booking.status)).length
          ? items.filter((booking) => ['pending', 'confirmed', 'checked_in'].includes(booking.status)).map((booking) => <TripCard booking={booking} key={booking.booking_id} />)
          : <Notice>No upcoming trips.</Notice>}
        <SectionTitle>Past</SectionTitle>
        {items.filter((booking) => !['pending', 'confirmed', 'checked_in'].includes(booking.status)).length
          ? items.filter((booking) => !['pending', 'confirmed', 'checked_in'].includes(booking.status)).map((booking) => <TripCard booking={booking} key={booking.booking_id} />)
          : <Notice>No past trips yet.</Notice>}
      </>}
    </Screen>
  );
}
