import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { RefreshControl, Text, View } from 'react-native';
import { hostMoney } from '@fuhara/core/host';
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
import {
  applyToHost,
  loadAccountContext,
  loadHostDashboard,
} from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import {
  formatStayDate,
  formatStayRange,
  hostBookingState,
} from '../../lib/presentation';
import { useSession } from '../../lib/session';
import type { HostContext, HostDashboard } from '../../lib/types';
import { colors } from '../../theme';

export default function HostHome() {
  const { user, loading: sessionLoading } = useSession();
  const [context, setContext] = useState<HostContext | null>(null);
  const [dashboard, setDashboard] = useState<HostDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
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
        const account = await loadAccountContext();
        setContext(account);
        if (account.account?.is_host) setDashboard(await loadHostDashboard());
        else setDashboard(null);
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
  async function apply() {
    setBusy(true);
    setMessage('');
    try {
      await applyToHost();
      setMessage('Host application submitted.');
      await load();
    } catch (error) {
      setMessage(
        errorMessage(
          error,
          'Complete your profile and phone number before applying.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  if (sessionLoading || loading)
    return <Loading label="Loading host workspace…" />;
  if (!user)
    return (
      <Screen>
        <Eyebrow>HOST WITH FUHARA</Eyebrow>
        <Title>Open your doors in Abuja.</Title>
        <Subtitle>
          Sign in to apply, verify your identity and manage stays.
        </Subtitle>
        <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />
      </Screen>
    );
  if (!context?.account?.is_host)
    return (
      <Screen>
        <Eyebrow>HOST WITH FUHARA</Eyebrow>
        <Title>Open your doors in Abuja / FCT.</Title>
        <Subtitle>
          Your profile needs a name and Nigerian phone number before you apply.
          Identity checks and Fuhara review come next.
        </Subtitle>
        {message ? <Notice>{message}</Notice> : null}
        <Button
          label={busy ? 'Submitting…' : 'Apply to host'}
          onPress={apply}
          disabled={busy}
        />
        <Button
          kind="secondary"
          label="Review profile"
          onPress={() => router.push('/(tabs)/account')}
        />
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
      <Eyebrow>YOUR FUHARA</Eyebrow>
      <Title>Host dashboard</Title>
      <Subtitle>
        Manage Abuja / FCT listings, availability and booking requests.
      </Subtitle>
      {message ? <Notice tone="error">{message}</Notice> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          kind="secondary"
          label={`Identity checks: ${context.host?.kyc_status === 'verified' ? 'Complete' : 'Action needed'}`}
          onPress={() => router.push('/host/kyc')}
        />
        <Button
          kind="secondary"
          label={
            dashboard?.summary.payout_readiness?.payout_ready
              ? 'Payout ready'
              : 'Payout setup'
          }
          onPress={() => router.push('/host/payouts')}
        />
      </View>
      {context.kyc?.listing_access ? (
        <Button
          label="Add a property"
          onPress={() => router.push('/host/listings/new')}
        />
      ) : (
        <Notice tone="warning">
          Your next step is Host verification. Listing creation unlocks only
          after provider checks and final Fuhara approval.
        </Notice>
      )}
      {dashboard ? (
        <>
          <Card>
            <SectionTitle>Overview</SectionTitle>
            <Text style={textStyles.body}>
              {dashboard.summary.booking_counts.pending || 0} pending requests ·{' '}
              {dashboard.summary.upcoming_stays || 0} upcoming stays
            </Text>
            <Text style={textStyles.body}>
              {hostMoney(dashboard.summary.expected_host_kobo || '0')} expected
            </Text>
            <Text style={textStyles.muted}>
              Expected earnings do not mean payment was collected.
            </Text>
          </Card>
          <SectionTitle>Needs your attention</SectionTitle>
          {dashboard.requests.items.length ? (
            dashboard.requests.items.map((booking) => {
              const state = hostBookingState(booking.status);
              return (
                <Card key={booking.booking_id}>
                  <StatusPill tone={state.tone}>{state.label}</StatusPill>
                  <SectionTitle>{booking.property_name}</SectionTitle>
                  <Text style={textStyles.body}>{booking.guest_name} · {formatStayRange(booking.check_in, booking.check_out)} · {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}</Text>
                  <Text style={textStyles.body}>{hostMoney(booking.base_amount_kobo)}</Text>
                  <Button kind="secondary" label="Review request" onPress={() => router.push(`/host/bookings/${booking.booking_id}`)} />
                </Card>
              );
            })
          ) : <Notice>No booking requests need a response.</Notice>}
          {context.host?.kyc_status !== 'verified' ? <Card>
            <SectionTitle>How approval works</SectionTitle>
            <Text style={textStyles.body}>
              1. Complete identity checks. 2. Fuhara approves the Host. 3. Add a
              property. 4. Fuhara reviews the listing. 5. Approved listings
              become visible to Guests automatically.
            </Text>
          </Card> : null}
          <SectionTitle>Your properties</SectionTitle>
          {dashboard.listings.length ? (
            dashboard.listings.map((listing) => (
              <Card key={listing.id}>
                <StatusPill
                  tone={listing.status === 'approved' ? 'success' : 'warning'}
                >
                  {listing.status}
                </StatusPill>
                <SectionTitle>{listing.title}</SectionTitle>
                <Text style={textStyles.muted}>
                  {listing.status === 'approved'
                    ? 'Visible to guests. Price and calendar updates stay live; material changes return to review.'
                    : listing.status === 'pending'
                      ? 'Waiting for Fuhara review. Guests cannot see it yet.'
                      : listing.status === 'rejected'
                        ? 'Changes are required before it can be reviewed again.'
                        : 'Contact support for the next available action.'}
                </Text>
                {listing.rejection_reason ? (
                  <Notice tone="warning">{listing.rejection_reason}</Notice>
                ) : null}
                <Button
                  kind="secondary"
                  label="Manage property"
                  onPress={() => router.push(`/host/listings/${listing.id}`)}
                />
              </Card>
            ))
          ) : (
            <Empty
              title="No properties yet"
              body="Complete verification, then add your first Abuja property."
            />
          )}
          <SectionTitle>Upcoming stays</SectionTitle>
          {dashboard.stays.items.length ? (
            dashboard.stays.items.map((booking) => (
              <Card key={booking.booking_id}>
                <StatusPill tone="success">{booking.status}</StatusPill>
                <Text style={textStyles.body}>
                  {booking.property_name} · {booking.guest_name} · {formatStayDate(booking.check_in)} · {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                </Text>
                <Text style={textStyles.body}>{hostMoney(booking.base_amount_kobo)} · projected before payout checks</Text>
                <Button kind="secondary" label="View stay" onPress={() => router.push(`/host/bookings/${booking.booking_id}`)} />
              </Card>
            ))
          ) : (
            <Notice>No upcoming stays.</Notice>
          )}
        </>
      ) : null}
    </Screen>
  );
}
