import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  money,
  thumbnailImageUrl,
  type CatalogProperty,
} from '@fuhara/core/catalog';
import { colors, radius, spacing } from '../theme';
import { FavoriteButton } from './favorite-button';

export function PropertyCard({
  property,
  compact = false,
  search,
}: {
  property: CatalogProperty;
  compact?: boolean;
  search?: { checkIn?: string; checkOut?: string; guests?: number };
}) {
  const image = thumbnailImageUrl(
    property.cover_image_url || property.images[0]?.url,
    800,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${property.stay_total_kobo !== null ? `total ${money(property.stay_total_kobo)}` : `${money(property.nightly_rate_kobo)} per night`}`}
      onPress={() =>
        router.push({
          pathname: '/properties/[id]',
          params: {
            id: property.id,
            checkIn: search?.checkIn || '',
            checkOut: search?.checkOut || '',
            guests: String(search?.guests || 1),
          },
        })
      }
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        pressed && { opacity: 0.84 },
      ]}
    >
      <View>
        {image ? (
          <Image
            source={{ uri: image }}
            style={[styles.image, compact && styles.compactImage]}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={[styles.fallback, compact && styles.compactImage]}>
            <Text style={styles.fallbackText}>FUHARA</Text>
          </View>
        )}
        <View style={styles.badge}>
          <ShieldCheck size={14} color={colors.tealDark} strokeWidth={2.2} />
          <Text style={styles.badgeText}>Verified host</Text>
        </View>
        <View style={styles.favorite}>
          <FavoriteButton propertyId={property.id} />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.area}>
          {property.area || 'Abuja'} ·{' '}
          {property.property_type.replaceAll('_', ' ')}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {property.title}
        </Text>
        <Text style={styles.facts}>
          {property.bedrooms} bed · {property.bathrooms} bath · up to{' '}
          {property.max_guests}
        </Text>
        <Text style={styles.price}>
          {property.stay_total_kobo !== null
            ? `${property.stay_nights} ${property.stay_nights === 1 ? 'night' : 'nights'} · total ${money(property.stay_total_kobo)}`
            : money(property.nightly_rate_kobo)}{' '}
          <Text style={styles.night}>
            {property.stay_total_kobo !== null
              ? `· ${money(property.nightly_rate_kobo)} / night`
              : '/ night'}
          </Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  compactCard: { width: 276 },
  image: { width: '100%', height: 218, backgroundColor: colors.cream },
  compactImage: { height: 168 },
  fallback: {
    width: '100%',
    height: 210,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.tealDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  badge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  favorite: { position: 'absolute', right: 12, top: 12 },
  content: { padding: spacing.md, gap: 6 },
  area: {
    color: colors.muted,
    textTransform: 'capitalize',
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  facts: { color: colors.muted, fontSize: 14 },
  price: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 4 },
  night: { color: colors.muted, fontWeight: '400' },
});
