import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { money, type CatalogProperty } from '@fuhara/core/catalog';
import { PropertyGallery } from '../../components/property-gallery';
import { FavoriteButton } from '../../components/favorite-button';
import { DateRangePicker } from '../../components/date-range-picker';
import {
  Button,
  Card,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  StatusPill,
} from '../../components/ui';
import { loadProperty, quoteBooking, requestBooking } from '../../lib/api';
import { bookingError, errorMessage } from '../../lib/errors';
import { useSession } from '../../lib/session';
import { useFavorites } from '../../lib/favorites';
import type { Quote } from '../../lib/types';
import { validateStayDates } from '../../lib/validation';
import { colors, radius, spacing } from '../../theme';

function Fact({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

export default function PropertyDetail() {
  const params = useLocalSearchParams<{
    id: string;
    save?: string;
    checkIn?: string | string[];
    checkOut?: string | string[];
    guests?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const saveIntent = Array.isArray(params.save) ? params.save[0] : params.save;
  const first = (value: string | string[] | undefined, fallback = '') =>
    Array.isArray(value) ? value[0] || fallback : value || fallback;
  const { user } = useSession();
  const { save } = useFavorites();
  const intentHandled = useRef(false);
  const [property, setProperty] = useState<CatalogProperty | null>(null);
  const [checkIn, setCheckIn] = useState(() => first(params.checkIn));
  const [checkOut, setCheckOut] = useState(() => first(params.checkOut));
  const [guests, setGuests] = useState(() => Math.max(1, Number(first(params.guests, '1')) || 1));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setProperty(await loadProperty(id));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (saveIntent !== '1' || !user || intentHandled.current) return;
    intentHandled.current = true;
    save(id).catch((error) =>
      setMessage(errorMessage(error, 'This stay could not be saved.')),
    );
  }, [id, save, saveIntent, user]);

  async function check() {
    const invalid = validateStayDates(checkIn, checkOut, today);
    if (invalid) return setMessage(invalid);
    const count = guests;
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > (property?.max_guests || 1)
    )
      return setMessage(
        `Choose between 1 and ${property?.max_guests || 1} guests.`,
      );
    setBusy(true);
    setMessage('');
    setQuote(null);
    try {
      const result = await quoteBooking(id, checkIn, checkOut, count);
      setQuote(result);
      if (!result.available)
        setMessage(
          'Those dates are already reserved. Please choose another stay period.',
        );
    } catch (error) {
      setMessage(bookingError(error));
    } finally {
      setBusy(false);
    }
  }

  async function book() {
    if (!quote?.available) return;
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const booking = await requestBooking(
        id,
        checkIn,
        checkOut,
        guests,
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/booking/${booking.booking_id}`);
    } catch (error) {
      setMessage(bookingError(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!property || busy || validateStayDates(checkIn, checkOut, today)) return;
    const timer = setTimeout(() => void check(), 300);
    return () => clearTimeout(timer);
    // Inputs are the intentional quote trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, guests, property?.id]);

  if (loading) return <Loading label="Opening stay…" />;
  if (!property)
    return (
      <Screen>
        <Notice tone="error">{message || 'This stay is not available.'}</Notice>
        <Button kind="secondary" label="Try again" onPress={load} />
      </Screen>
    );

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.gallery}>
        <PropertyGallery property={property} />
        <View style={styles.favorite}>
          <FavoriteButton
            propertyId={property.id}
            onError={(error) =>
              setMessage(errorMessage(error, 'Favorite could not be updated.'))
            }
          />
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.locationRow}>
          <StatusPill tone="success">Verified host</StatusPill>
          <Text style={styles.location}>
            {property.area || 'Abuja'}, {property.state}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {property.title}
        </Text>
        <Text style={styles.type}>
          {property.property_type.replaceAll('_', ' ')} · curated by Fuhara
        </Text>

        <View style={styles.facts}>
          <Fact
            value={property.bedrooms}
            label={property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
          />
          <View style={styles.factDivider} />
          <Fact
            value={property.bathrooms}
            label={property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}
          />
          <View style={styles.factDivider} />
          <Fact value={property.max_guests} label="Guests" />
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>ABOUT THIS STAY</Text>
          <SectionTitle>A place to settle in</SectionTitle>
          <Text style={styles.body}>
            {property.description ||
              'A verified Abuja stay selected for comfort, convenience, and a more considered visit.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOUR ARRIVAL</Text>
          <SectionTitle>Stay details</SectionTitle>
          <Text style={styles.body}>Check-in from {property.check_in_time.slice(0, 5)} · Check-out by {property.check_out_time.slice(0, 5)}</Text>
          <Text style={styles.body}>Minimum stay: {property.minimum_stay_nights} {property.minimum_stay_nights === 1 ? 'night' : 'nights'}</Text>
          <Text style={styles.body}>House rules: {property.house_rules}</Text>
          <Text style={styles.body}>Cancellation: {property.cancellation_policy}</Text>
          <Text style={styles.body}>{property.host_first_name ? `Hosted by ${property.host_first_name}, a verified Fuhara host.` : 'Managed by a verified Fuhara host.'}</Text>
          <View style={styles.place}><Text style={styles.placeLabel}>APPROXIMATE AREA</Text><Text style={styles.placeName}>{property.area || property.city}</Text></View>
          <Text style={styles.dateHelp}>The exact address is shared after the host accepts your request.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>WHAT YOU’LL HAVE</Text>
          <SectionTitle>Everyday comforts</SectionTitle>
          <View style={styles.amenities}>
            {property.amenities.map((amenity) => (
              <View key={amenity.code} style={styles.amenity}>
                <View style={styles.check}>
                  <Check size={15} color={colors.tealDark} strokeWidth={2.5} />
                </View>
                <Text style={styles.amenityText}>{amenity.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card style={styles.bookingCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.eyebrow}>YOUR STAY</Text>
              <Text style={styles.price}>
                {money(property.nightly_rate_kobo)}{' '}
                <Text style={styles.night}>/ night</Text>
              </Text>
            </View>
            <View style={styles.verifiedMark}>
              <ShieldCheck
                size={21}
                color={colors.tealDark}
                strokeWidth={2.2}
              />
            </View>
          </View>
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(start, end) => {
              setCheckIn(start);
              setCheckOut(end);
              setQuote(null);
            }}
          />
          <View style={styles.guestRow}>
            <Text style={styles.guestLabel}>Guests</Text>
            <View style={styles.stepper}>
              <Text onPress={() => { setGuests(Math.max(1, guests - 1)); setQuote(null); }} accessibilityRole="button" accessibilityLabel="Remove a guest" style={styles.stepButton}>−</Text>
              <Text style={styles.guestValue}>{guests}</Text>
              <Text onPress={() => {
                if (guests >= property.max_guests) {
                  setMessage(`This stay fits up to ${property.max_guests} ${property.max_guests === 1 ? 'guest' : 'guests'}.`);
                  return;
                }
                setGuests(guests + 1);
                setQuote(null);
              }} accessibilityRole="button" accessibilityLabel="Add a guest" style={styles.stepButton}>+</Text>
            </View>
            <Text style={styles.dateHelp}>Up to {property.max_guests}</Text>
          </View>
          {message ? <Notice tone="error">{message}</Notice> : null}
          {quote?.available ? (
            <View style={styles.quote}>
              <Text style={styles.quoteLabel}>
                {quote.nights} nights · total
              </Text>
              <Text style={styles.quotePrice}>
                {money(Number(quote.guest_total_kobo))}
              </Text>
            </View>
          ) : null}
          <Button
            label={
              busy
                ? 'Checking…'
                : quote?.available
                  ? user
                    ? 'Request this stay'
                    : 'Sign in to request'
                  : 'Check availability'
            }
            disabled={busy}
            onPress={quote?.available ? book : check}
          />
          <Text style={styles.truth}>
            No payment is taken with a request. Fuhara confirms availability
            and the current total before you continue.
          </Text>
        </Card>

        <View style={styles.assurance}>
          <ShieldCheck size={30} color="#A9E5DF" strokeWidth={2} />
          <View style={styles.assuranceCopy}>
            <Text style={styles.assuranceTitle}>The Fuhara standard</Text>
            <Text style={styles.assuranceBody}>
              Verified listings, clear NGN pricing, and human support when you
              need it.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, paddingBottom: 120, gap: 0 },
  gallery: { position: 'relative' },
  favorite: { position: 'absolute', right: spacing.md, top: spacing.md },
  content: { padding: spacing.md, gap: spacing.lg },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  location: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  type: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: -14,
  },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 18,
  },
  fact: { flex: 1, alignItems: 'center', gap: 3 },
  factValue: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  factLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  factDivider: { width: 1, height: 32, backgroundColor: colors.line },
  section: { gap: spacing.sm, paddingVertical: spacing.sm },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  body: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 13 },
  amenity: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.softTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityText: { color: colors.ink, fontSize: 14, flexShrink: 1 },
  bookingCard: { padding: spacing.lg },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: { color: colors.ink, fontSize: 27, fontWeight: '900', marginTop: 5 },
  night: { color: colors.muted, fontSize: 14, fontWeight: '500' },
  verifiedMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.softTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  fieldHalf: { flex: 1 },
  dateHelp: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  guestRow: { gap: 8 },
  guestLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink, fontSize: 24, lineHeight: 40, fontWeight: '800', textAlign: 'center' },
  guestValue: { minWidth: 32, color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  place: { minHeight: 140, borderRadius: radius.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 6 },
  placeLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  placeName: { color: colors.tealDeep, fontSize: 22, fontWeight: '900' },
  quote: {
    borderRadius: radius.md,
    backgroundColor: colors.paleTeal,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  quotePrice: { color: colors.tealDeep, fontSize: 18, fontWeight: '900' },
  truth: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  assurance: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.ink,
    gap: spacing.md,
  },
  assuranceCopy: { flex: 1, gap: 5 },
  assuranceTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  assuranceBody: { color: '#CAE0DD', fontSize: 13, lineHeight: 20 },
});
