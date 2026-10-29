import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Camera, Images, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  abujaNeighbourhoods,
  amenityOptions,
  hostMoney,
  nairaToKobo,
  propertyTypes,
  type HostProperty,
} from '@fuhara/core/host';
import {
  Button,
  Card,
  Field,
  FormScreen,
  Notice,
  SectionTitle,
  Subtitle,
  Title,
  textStyles,
} from './ui';
import {
  addAvailabilityBlock,
  removeAvailabilityBlock,
  saveHostListing,
  updateHostListingPrice,
} from '../lib/api';
import { errorMessage } from '../lib/errors';
import { formatStayRange } from '../lib/presentation';
import {
  choosePropertyPhoto,
  uploadPropertyPhoto,
  type UploadProgress,
} from '../lib/upload';
import type { ListingDraft } from '../lib/validation';
import { colors, radius, spacing } from '../theme';
import { DateRangePicker } from './date-range-picker';

type AvailabilityBlock = {
  id: string;
  start_date: string;
  end_date: string;
  source: string;
  note: string | null;
};

function naira(value: string | number) {
  const amount = BigInt(value);
  const fraction = (amount % 100n).toString().padStart(2, '0');
  return `${amount / 100n}${fraction === '00' ? '' : `.${fraction}`}`;
}

export function ListingEditor({
  userId,
  property,
  availability = [],
  onReload,
}: {
  userId: string;
  property?: HostProperty;
  availability?: AvailabilityBlock[];
  onReload?: () => Promise<void>;
}) {
  const existingPhotos = property?.property_images?.length
    ? property.property_images
    : property?.cover_image_url
      ? [{ url: property.cover_image_url, alt_text: property.title }]
      : [];
  const [draft, setDraft] = useState<ListingDraft>({
    id: property?.id,
    updatedAt: property?.updated_at,
    title: property?.title || '',
    description: property?.description || '',
    propertyType: property?.property_type || 'apartment',
    addressLine: property?.address_line || '',
    area: property?.area || '',
    city: property?.city || 'Abuja',
    state: property?.state || 'FCT',
    country: property?.country || 'Nigeria',
    bedrooms: String(property?.bedrooms ?? 1),
    bathrooms: String(property?.bathrooms ?? 1),
    maxGuests: String(property?.max_guests ?? 2),
    nightlyRate: property ? naira(property.nightly_rate_kobo) : '',
    amenities:
      property?.property_amenities?.map((item) => item.label).join('\n') || '',
    checkInTime: property?.check_in_time?.slice(0, 5) || '15:00',
    checkOutTime: property?.check_out_time?.slice(0, 5) || '11:00',
    houseRules:
      property?.house_rules ||
      'Please respect the property and the neighbourhood.',
    cancellationPolicy:
      property?.cancellation_policy ||
      'Free cancellation while the booking request is still awaiting host acceptance.',
    photos: existingPhotos,
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockNote, setBlockNote] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const update = (
    key: keyof ListingDraft,
    value: ListingDraft[keyof ListingDraft],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));
  const previewRate = useMemo(() => {
    try {
      const value = Number(draft.nightlyRate) * 100;
      return Number.isSafeInteger(value) && value >= 0
        ? hostMoney(value)
        : 'Price pending';
    } catch {
      return 'Price pending';
    }
  }, [draft.nightlyRate]);

  async function addPhoto(source: 'camera' | 'library') {
    if (draft.photos.length >= 20) return setMessage('Use at most 20 photos.');
    setBusy(true);
    setMessage('');
    try {
      const asset = await choosePropertyPhoto(source);
      if (!asset) return;
      const photo = await uploadPropertyPhoto(userId, asset, setProgress);
      update('photos', [...draft.photos, photo]);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      setMessage(errorMessage(error, 'Photo upload failed.'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const id = await saveHostListing(draft);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/host/listings/${id}`);
    } catch (error) {
      setMessage(errorMessage(error, 'Check the listing and try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function addBlock() {
    if (!property) return;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(blockStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(blockEnd) ||
      blockEnd <= blockStart
    )
      return setMessage('Choose an end date after the start date.');
    setBusy(true);
    setMessage('');
    try {
      await addAvailabilityBlock(property.id, blockStart, blockEnd, blockNote);
      setBlockStart('');
      setBlockEnd('');
      setBlockNote('');
      await onReload?.();
    } catch (error) {
      setMessage(
        errorMessage(
          error,
          'These dates may overlap a reservation or another block.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePriceOnly() {
    if (!property) return;
    const rate = nairaToKobo(draft.nightlyRate.trim());
    if (!rate) return setMessage('Enter a valid nightly rate in NGN.');
    setBusy(true);
    setMessage('');
    try {
      const result = await updateHostListingPrice(
        property.id,
        property.updated_at,
        rate,
      );
      setMessage(
        result.kept_live
          ? 'Nightly rate updated. Your approved listing is still live.'
          : 'Nightly rate updated.',
      );
      await onReload?.();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number);
  const calendarDays = new Date(Date.UTC(calendarYear, calendarMonthNumber, 0)).getUTCDate();
  const leadingDays = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1)).getUTCDay();
  function moveMonth(offset: number) {
    const date = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1 + offset, 1));
    setCalendarMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <FormScreen>
      <Title>{property ? property.title : 'Create an Abuja stay.'}</Title>
      <Subtitle>
        Keep your calendar and price current. Material listing changes return
        to Fuhara review.
      </Subtitle>
      {property?.rejection_reason ? (
        <Notice tone="warning">Review note: {property.rejection_reason}</Notice>
      ) : null}
      {message ? <Notice tone="error">{message}</Notice> : null}
      {property ? (
        <Card>
          <SectionTitle>Availability calendar</SectionTitle>
          <Text style={textStyles.muted}>
            Choose dates to block. Existing reservations cannot be changed here.
          </Text>
          <View style={styles.monthNav}>
            <Pressable accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={styles.monthButton}><Text>‹</Text></Pressable>
            <Text style={styles.monthTitle}>{new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${calendarMonth}-01T00:00:00Z`))}</Text>
            <Pressable accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={styles.monthButton}><Text>›</Text></Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {['S','M','T','W','T','F','S'].map((day, index) => <Text style={styles.weekday} key={`${day}-${index}`}>{day}</Text>)}
            {Array.from({ length: leadingDays }, (_, index) => <View key={`blank-${index}`} />)}
            {Array.from({ length: calendarDays }, (_, index) => {
              const date = `${calendarMonth}-${String(index + 1).padStart(2, '0')}`;
              const block = availability.find((item) => item.start_date <= date && item.end_date > date);
              const past = date < new Date().toISOString().slice(0, 10);
              return <Pressable key={date} disabled={Boolean(block) || past} onPress={() => {
                const end = new Date(`${date}T12:00:00Z`);
                end.setUTCDate(end.getUTCDate() + 1);
                setBlockStart(date);
                setBlockEnd(end.toISOString().slice(0, 10));
              }} style={[styles.day, block && styles.dayBlocked, past && styles.dayPast]}>
                <Text style={styles.dayNumber}>{index + 1}</Text>
                <Text style={styles.dayState}>{block ? (block.source === 'booking' ? 'Reserved' : 'Blocked') : past ? '' : 'Open'}</Text>
              </Pressable>;
            })}
          </View>
          {availability.filter((block) => block.end_date >= new Date().toISOString().slice(0, 10)).map((block) => (
            <View style={styles.block} key={block.id}>
              <Text style={textStyles.body}>
                {formatStayRange(block.start_date, block.end_date)} ·{' '}
                {block.source}
              </Text>
              {block.source === 'manual' ? (
                <Button
                  kind="secondary"
                  label="Remove block"
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await removeAvailabilityBlock(property.id, block.id);
                      await onReload?.();
                    } catch (error) {
                      setMessage(errorMessage(error));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                />
              ) : null}
            </View>
          ))}
          <DateRangePicker checkIn={blockStart} checkOut={blockEnd} onChange={(start, end) => { setBlockStart(start); setBlockEnd(end); }} />
          <Field label="Note" value={blockNote} onChangeText={setBlockNote} />
          <Button
            kind="secondary"
            label="Block dates"
            onPress={addBlock}
            disabled={busy}
          />
        </Card>
      ) : null}
      <Card>
        <SectionTitle>Basics</SectionTitle>
        <Field
          label="Title"
          value={draft.title}
          onChangeText={(value) => update('title', value)}
        />
        <Field
          label="Description"
          value={draft.description}
          onChangeText={(value) => update('description', value)}
          multiline
        />
        <Text style={styles.label}>Property type</Text>
        <View style={styles.chips}>
          {propertyTypes.map((value) => (
            <Pressable
              key={value}
              style={[
                styles.chip,
                draft.propertyType === value && styles.chipActive,
              ]}
              onPress={() => update('propertyType', value)}
            >
              <Text style={styles.chipText}>{value.replaceAll('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <SectionTitle>Abuja location</SectionTitle>
        <Field
          label="Address"
          value={draft.addressLine}
          onChangeText={(value) => update('addressLine', value)}
        />
        <Text style={styles.label}>Neighbourhood</Text>
        <View style={styles.chips}>
          {abujaNeighbourhoods.map((area) => (
            <Pressable key={area} style={[styles.chip, draft.area === area && styles.chipActive]} onPress={() => update('area', area)}>
              <Text style={styles.chipText}>{area}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="City"
          value={draft.city}
          onChangeText={(value) => update('city', value)}
        />
        <Field
          label="State"
          value={draft.state}
          onChangeText={(value) => update('state', value)}
        />
        <Field
          label="Country"
          value={draft.country}
          onChangeText={(value) => update('country', value)}
        />
      </Card>
      <Card>
        <SectionTitle>Capacity and price</SectionTitle>
        <Field
          label="Bedrooms"
          value={draft.bedrooms}
          onChangeText={(value) => update('bedrooms', value)}
          keyboardType="number-pad"
        />
        <Field
          label="Bathrooms"
          value={draft.bathrooms}
          onChangeText={(value) => update('bathrooms', value)}
          keyboardType="decimal-pad"
        />
        <Field
          label="Maximum guests"
          value={draft.maxGuests}
          onChangeText={(value) => update('maxGuests', value)}
          keyboardType="number-pad"
        />
        <Field
          label="Nightly rate (NGN)"
          value={draft.nightlyRate}
          onChangeText={(value) => update('nightlyRate', value)}
          keyboardType="decimal-pad"
        />
        {property ? <Button kind="secondary" label="Update price only" onPress={savePriceOnly} disabled={busy} /> : null}
        <Text style={styles.label}>Amenities</Text>
        <View style={styles.chips}>
          {amenityOptions.map((amenity) => {
            const selected = draft.amenities.split('\n').includes(amenity.label);
            return <Pressable key={amenity.code} style={[styles.chip, selected && styles.chipActive]} onPress={() => {
              const current = draft.amenities.split('\n').map((item) => item.trim()).filter(Boolean);
              update('amenities', (selected ? current.filter((item) => item !== amenity.label) : [...current, amenity.label]).join('\n'));
            }}><Text style={styles.chipText}>{amenity.label}</Text></Pressable>;
          })}
        </View>
        <Field label="Check-in time" value={draft.checkInTime} onChangeText={(value) => update('checkInTime', value)} placeholder="15:00" />
        <Field label="Check-out time" value={draft.checkOutTime} onChangeText={(value) => update('checkOutTime', value)} placeholder="11:00" />
        <Field label="House rules" value={draft.houseRules} onChangeText={(value) => update('houseRules', value)} multiline />
        <Field label="Cancellation policy" value={draft.cancellationPolicy} onChangeText={(value) => update('cancellationPolicy', value)} multiline />
      </Card>
      <Card>
        <SectionTitle>Photos</SectionTitle>
        <View style={styles.photos}>
          {draft.photos.map((photo, index) => (
            <View
              key={photo.storage_path || photo.url || index}
              style={styles.photoWrap}
            >
              <Image
                source={{ uri: photo.url }}
                style={styles.photo}
                contentFit="cover"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                style={styles.remove}
                onPress={() =>
                  update(
                    'photos',
                    draft.photos.filter(
                      (_, photoIndex) => photoIndex !== index,
                    ),
                  )
                }
              >
                <X size={16} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>
          ))}
        </View>
        {progress ? (
          <Notice>
            {progress.message} · {progress.percent}% · attempt{' '}
            {progress.attempt}/3
          </Notice>
        ) : null}
        <Button
          kind="secondary"
          label="Choose from library"
          icon={<Images size={20} color={colors.ink} strokeWidth={2} />}
          onPress={() => addPhoto('library')}
          disabled={busy}
        />
        <Button
          kind="secondary"
          label="Take a photo"
          icon={<Camera size={20} color={colors.ink} strokeWidth={2} />}
          onPress={() => addPhoto('camera')}
          disabled={busy}
        />
      </Card>
      <Card>
        <SectionTitle>Preview</SectionTitle>
        {draft.photos[0]?.url ? (
          <Image
            source={{ uri: draft.photos[0].url }}
            style={styles.preview}
            contentFit="cover"
          />
        ) : null}
        <Text style={styles.previewTitle}>
          {draft.title || 'Your property title'}
        </Text>
        <Text style={textStyles.muted}>
          {draft.area || 'Abuja'} · up to {draft.maxGuests || '—'} guests
        </Text>
        <Text style={textStyles.body}>{previewRate} / night</Text>
      </Card>
      {message ? <Notice tone="error">{message}</Notice> : null}
      <Button
        label={busy ? 'Submitting…' : 'Submit for review'}
        onPress={save}
        disabled={busy}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  chipActive: { borderColor: colors.teal, backgroundColor: colors.softTeal },
  chipText: { color: colors.ink, textTransform: 'capitalize' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photo: {
    width: 92,
    height: 76,
    borderRadius: radius.sm,
    backgroundColor: colors.softTeal,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: 180, borderRadius: radius.sm },
  previewTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  block: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  weekday: { width: '13%', textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '900' },
  day: { width: '13%', minHeight: 54, borderRadius: 8, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  dayBlocked: { backgroundColor: '#F3DED3' },
  dayPast: { opacity: 0.35 },
  dayNumber: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  dayState: { color: colors.muted, fontSize: 7 },
});
