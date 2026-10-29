import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { House } from 'lucide-react-native';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { money } from '@fuhara/core/catalog';
import {
  Button,
  Card,
  Loading,
  Notice,
  Screen,
  StatusPill,
} from '../../components/ui';
import { cancelBooking, loadBooking } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import {
  formatEventDateTime,
  formatStayDate,
  guestBookingState,
} from '../../lib/presentation';
import type { BookingDetail } from '../../lib/types';
import { colors, spacing } from '../../theme';

function label(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setDetail(await loadBooking(id));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  function confirmCancel() {
    Alert.alert(
      'Cancel booking request?',
      'The backend will check whether cancellation is still allowed.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(id);
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              await load();
            } catch (error) {
              setMessage(
                errorMessage(error, 'This booking cannot be cancelled now.'),
              );
            }
          },
        },
      ],
    );
  }

  if (loading) return <Loading label="Loading your stay…" />;
  if (!detail)
    return (
      <Screen>
        <Notice tone="error">{message || 'Booking not found.'}</Notice>
        <Button kind="secondary" label="Try again" onPress={load} />
      </Screen>
    );
  const booking = detail.booking;
  const bookingState = guestBookingState(
    booking.status,
    booking.payment_status,
    false,
  );

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.wordmark}>FUHARA</Text>
          <StatusPill tone={bookingState.tone}>{bookingState.label}</StatusPill>
        </View>
        <Text style={styles.eyebrow}>BOOKING #{booking.booking_number}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {booking.property_name}
        </Text>
        <Text style={styles.heroMeta}>
          {booking.nights} night{booking.nights === 1 ? '' : 's'} in Abuja ·{' '}
          {booking.guests} guest{booking.guests === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.content}>
        {message ? <Notice tone="error">{message}</Notice> : null}
        <Notice tone={bookingState.tone === 'warning' ? 'warning' : 'info'}>
          {bookingState.title}. {bookingState.body}
        </Notice>
        <Card style={styles.itinerary}>
          <Text style={styles.cardEyebrow}>YOUR ITINERARY</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>CHECK-IN</Text>
              <Text style={styles.date}>
                {formatStayDate(booking.check_in)}
              </Text>
              <Text style={styles.dateHint}>From {detail.stay.check_in_time.slice(0, 5)}</Text>
            </View>
            <View style={styles.journey}>
              <View style={styles.journeyDot} />
              <View style={styles.journeyLine} />
              <House size={18} color={colors.tealDark} strokeWidth={2} />
              <View style={styles.journeyLine} />
              <View style={styles.journeyDot} />
            </View>
            <View style={[styles.dateBlock, styles.dateEnd]}>
              <Text style={styles.dateLabel}>CHECK-OUT</Text>
              <Text style={styles.date}>
                {formatStayDate(booking.check_out)}
              </Text>
              <Text style={styles.dateHint}>By {detail.stay.check_out_time.slice(0, 5)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.priceCard}>
          <Text style={styles.cardEyebrow}>BOOKING SUMMARY</Text>
          <View style={styles.lineItem}>
            <Text style={styles.lineLabel}>Stay total</Text>
            <Text style={styles.lineValue}>
              {money(Number(booking.guest_total_kobo))}
            </Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={styles.lineLabel}>Payment status</Text>
            <Text style={styles.lineValue}>
              {['paid', 'settled'].includes(booking.payment_status || '')
                ? 'Paid'
                : 'Payment unavailable in beta'}
            </Text>
          </View>
          <View style={styles.rule} />
          <View style={styles.lineItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {money(Number(booking.guest_total_kobo))}
            </Text>
          </View>
          {!booking.payment_enabled ? (
            <Notice tone="warning">
              Amount due {money(Number(booking.guest_total_kobo))}. Payment
              collection is unavailable in beta.
            </Notice>
          ) : null}
        </Card>

        <Card style={styles.priceCard}>
          <Text style={styles.cardEyebrow}>ARRIVAL &amp; STAY</Text>
          <Text style={styles.sectionTitle}>{detail.stay.address ? 'Your arrival details' : 'Plan your arrival'}</Text>
          <Text style={styles.lineLabel}>{[detail.stay.area, detail.stay.city, detail.stay.state].filter(Boolean).join(', ')}</Text>
          <Text style={styles.lineValue}>{detail.stay.address || 'The exact address is shared after the host accepts your request.'}</Text>
          <Text style={styles.lineLabel}>{detail.stay.host_first_name ? `Hosted by ${detail.stay.host_first_name}` : 'Verified Fuhara host'}</Text>
          <View style={styles.rule} />
          <Text style={styles.lineValue}>House rules</Text>
          <Text style={styles.lineLabel}>{detail.stay.house_rules}</Text>
          <Text style={styles.lineValue}>Cancellation</Text>
          <Text style={styles.lineLabel}>{detail.stay.cancellation_policy}</Text>
        </Card>

        <View style={styles.timelineSection}>
          <Text style={styles.cardEyebrow}>STAY JOURNEY</Text>
          <Text style={styles.sectionTitle}>Booking timeline</Text>
          <View style={styles.timeline}>
            {detail.timeline.map((event, index) => (
              <View key={event.id} style={styles.event}>
                <View style={styles.eventRail}>
                  <View
                    style={[
                      styles.eventDot,
                      index === 0 && styles.eventDotActive,
                    ]}
                  />
                  {index < detail.timeline.length - 1 ? (
                    <View style={styles.eventLine} />
                  ) : null}
                </View>
                <View style={styles.eventCopy}>
                  <Text style={styles.eventTitle}>
                    {event.event_type === 'created'
                      ? 'Booking request created'
                      : `Status changed to ${label(event.to_status)}`}
                  </Text>
                  <Text style={styles.eventMeta}>
                    {event.actor_label} ·{' '}
                    {formatEventDateTime(event.occurred_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          {booking.property_id ? (
            <Button
              kind="secondary"
              label="View property"
              onPress={() => router.push(`/properties/${booking.property_id}`)}
            />
          ) : null}
          <Button
            kind="secondary"
            label="Get help with this stay"
            onPress={() =>
              router.push({
                pathname: '/support',
                params: { category: 'booking', bookingId: id },
              })
            }
          />
          {detail.permissions.can_cancel ? (
            <Button
              kind="danger"
              label="Cancel booking request"
              onPress={confirmCancel}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, paddingBottom: 110, gap: 0 },
  hero: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 38,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  wordmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3.2,
  },
  eyebrow: {
    color: '#9EDCD6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroMeta: { color: '#C8DEDB', fontSize: 14, lineHeight: 21 },
  content: { padding: spacing.md, gap: spacing.lg, marginTop: -18 },
  itinerary: { padding: spacing.lg },
  cardEyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dateBlock: { width: 112, gap: 3 },
  dateEnd: { alignItems: 'flex-end' },
  dateLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  date: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  dateHint: { color: colors.muted, fontSize: 10 },
  journey: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  journeyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  journeyLine: { flex: 1, height: 1, backgroundColor: colors.line },
  priceCard: { padding: spacing.lg, backgroundColor: colors.cream },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  lineLabel: { color: colors.muted, fontSize: 14 },
  lineValue: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: spacing.xs },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  totalValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  timelineSection: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  sectionTitle: {
    color: colors.ink,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  timeline: { marginTop: spacing.xs },
  event: { flexDirection: 'row', minHeight: 72 },
  eventRail: { width: 26, alignItems: 'center' },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  eventDotActive: { borderColor: colors.teal, backgroundColor: colors.teal },
  eventLine: { flex: 1, width: 2, backgroundColor: colors.line },
  eventCopy: { flex: 1, paddingBottom: spacing.md },
  eventTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  eventMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  actions: { gap: spacing.sm },
});
