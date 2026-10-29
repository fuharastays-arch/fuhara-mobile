import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Trees,
  UsersRound,
  type LucideIcon,
} from 'lucide-react-native';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  parseFilters,
  thumbnailImageUrl,
  type CatalogProperty,
} from '@fuhara/core/catalog';
import { PropertyCard } from '../../components/property-card';
import { DateRangePicker } from '../../components/date-range-picker';
import { Loading, Notice } from '../../components/ui';
import { loadCatalog } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing } from '../../theme';
import { useSession } from '../../lib/session';

const collections = [
  {
    label: 'City escapes',
    destination: 'Wuse',
    detail: 'Central & connected',
    icon: Building2,
  },
  {
    label: 'Quiet retreats',
    destination: 'Maitama',
    detail: 'Calm, leafy addresses',
    icon: Trees,
  },
  {
    label: 'Longer stays',
    destination: 'Abuja',
    detail: 'Room to settle in',
    icon: BriefcaseBusiness,
  },
];

export default function Home() {
  const { user } = useSession();
  const [items, setItems] = useState<CatalogProperty[]>([]);
  const [destination, setDestination] = useState('Abuja');
  const [guests, setGuests] = useState('2');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setMessage('');
    try {
      const page = await loadCatalog(
        parseFilters({
          destination: 'Abuja',
          guests: '1',
          sort: 'newest',
          page: '1',
        }),
      );
      setItems(page.items);
    } catch (error) {
      setMessage(
        errorMessage(error, 'Curated Abuja stays could not be loaded.'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function search(nextDestination = destination) {
    router.push({
      pathname: '/search',
      params: {
        destination: nextDestination.trim() || 'Abuja',
        guests: guests || '1',
        checkIn,
        checkOut,
      },
    });
  }

  const feature = items[0];
  const featureImage = feature
    ? thumbnailImageUrl(
        feature.cover_image_url || feature.images[0]?.url,
        1000,
        88,
      )
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.teal}
          />
        }
      >
        <View style={styles.nav}>
          <View>
            <Text style={styles.wordmark}>FUHARA</Text>
            <Text style={styles.stage}>ABUJA / FCT</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/(tabs)/account')}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{user ? (user.email?.[0] || 'F').toUpperCase() : '○'}</Text>
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.kicker}>VERIFIED HOSPITALITY</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Stays with a{`\n`}softer pace.
          </Text>
          <Text style={styles.heroBody}>
            Thoughtfully selected homes for work, rest, and everything in
            between.
          </Text>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchIcon}>
              <Search size={20} color={colors.tealDark} strokeWidth={2.2} />
            </View>
            <View style={styles.searchField}>
              <Text style={styles.fieldLabel}>WHERE</Text>
              <TextInput
                accessibilityLabel="Destination"
                value={destination}
                onChangeText={setDestination}
                style={styles.input}
                placeholder="Where do you want to stay?"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                onSubmitEditing={() => search()}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search stays"
              onPress={() => search()}
              style={styles.searchButton}
            >
              <Search size={22} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
          <View style={styles.divider} />
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(start, end) => {
              setCheckIn(start);
              setCheckOut(end);
            }}
          />
          <View style={styles.searchActions}>
            <View style={styles.searchChip}>
              <UsersRound size={18} color={colors.ink} strokeWidth={2} />
              <View style={styles.chipCopy}>
                <Text style={styles.chipLabel}>GUESTS</Text>
                <View style={styles.guestStepper}>
                  <Pressable accessibilityLabel="Remove a guest" disabled={Number(guests) <= 1} onPress={() => setGuests(String(Math.max(1, Number(guests) - 1)))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable>
                  <Text style={styles.guestValue}>{guests}</Text>
                  <Pressable accessibilityLabel="Add a guest" onPress={() => setGuests(String(Math.min(100, Number(guests) + 1)))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable>
                </View>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open search filters"
              onPress={() => search()}
              style={styles.filterChip}
            >
              <SlidersHorizontal size={18} color={colors.ink} strokeWidth={2} />
              <Text style={styles.filterText}>Filters</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.eyebrow}>CURATED FOR YOU</Text>
            <Text style={styles.sectionTitle}>Beautiful stays in Abuja</Text>
          </View>
          <Pressable
            onPress={() => search('Abuja')}
            style={styles.sectionHeadingAction}
          >
            <Text style={styles.link}>See all</Text>
          </Pressable>
        </View>
        {message ? (
          <View style={styles.inset}>
            <Notice tone="error">{message}</Notice>
          </View>
        ) : null}
        {loading ? (
          <Loading label="Curating stays…" />
        ) : (
          <FlatList
            style={styles.cardRailFrame}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={items.slice(0, 6)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cardRail}
            ItemSeparatorComponent={() => (
              <View style={{ width: spacing.md }} />
            )}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                compact
                search={{ checkIn, checkOut, guests: Number(guests) || 1 }}
              />
            )}
            scrollEnabled={items.length > 1}
          />
        )}

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.eyebrow}>FIND YOUR RHYTHM</Text>
            <Text style={styles.sectionTitle}>Explore by mood</Text>
          </View>
        </View>
        <View style={styles.collections}>
          {collections.map((collection) => {
            const CollectionIcon = collection.icon as LucideIcon;
            return (
              <Pressable
                key={collection.label}
                onPress={() => search(collection.destination)}
                style={({ pressed }) => [
                  styles.collection,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={styles.collectionIcon}>
                  <CollectionIcon
                    size={22}
                    color={colors.ink}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.collectionCopy}>
                  <Text style={styles.collectionTitle}>{collection.label}</Text>
                  <Text style={styles.collectionDetail}>
                    {collection.detail}
                  </Text>
                </View>
                <ChevronRight size={21} color={colors.muted} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={!feature}
          onPress={() => feature && router.push(`/properties/${feature.id}`)}
          style={styles.editorial}
        >
          {featureImage ? (
            <Image
              source={{ uri: featureImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.editorialShade} />
          <View style={styles.editorialCopy}>
            <Text style={styles.editorialEyebrow}>THE FUHARA STANDARD</Text>
            <Text style={styles.editorialTitle}>
              Verified homes.{`\n`}Considered comfort.
            </Text>
            <Text style={styles.editorialBody}>
              Every published stay is reviewed before it reaches you.
            </Text>
          </View>
        </Pressable>
        <Text style={styles.footer}>FUHARA · ABUJA / FCT</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { paddingBottom: 110 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  wordmark: {
    color: colors.tealDeep,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 4,
  },
  stage: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginTop: 3,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  intro: {
    paddingHorizontal: spacing.md,
    paddingTop: 30,
    paddingBottom: 20,
    gap: spacing.sm,
  },
  kicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.8,
  },
  heroBody: {
    maxWidth: 330,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  searchCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 11,
  },
  searchRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: { flex: 1 },
  fieldLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  input: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: colors.line },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActions: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  searchChip: {
    minHeight: 50,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
  },
  chipCopy: { flex: 1, minWidth: 0 },
  chipLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  chipValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  guestInput: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
    minHeight: 22,
  },
  guestStepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  stepButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepText: { color: colors.ink, fontSize: 20, lineHeight: 22, fontWeight: '800' },
  guestValue: { minWidth: 22, textAlign: 'center', color: colors.ink, fontSize: 15, fontWeight: '900' },
  filterChip: {
    minHeight: 50,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    gap: 2,
  },
  filterText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    marginTop: 32,
    marginBottom: spacing.md,
  },
  sectionHeadingCopy: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  sectionHeadingAction: { flexShrink: 0 },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  link: { color: colors.tealDark, fontWeight: '800', paddingVertical: 5 },
  inset: { paddingHorizontal: spacing.md },
  cardRailFrame: { flexGrow: 0 },
  cardRail: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  collections: {
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  collection: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  collectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCopy: { flex: 1, marginLeft: 13 },
  collectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  collectionDetail: { color: colors.muted, fontSize: 13, marginTop: 3 },
  editorial: {
    height: 286,
    marginHorizontal: spacing.md,
    marginTop: 32,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.tealDeep,
  },
  editorialShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5,37,34,0.56)',
  },
  editorialCopy: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg },
  editorialEyebrow: {
    color: '#BFE9E5',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  editorialTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: spacing.sm,
  },
  editorialBody: {
    color: '#E6F1EF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 290,
  },
  footer: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    textAlign: 'center',
    marginTop: 40,
  },
});
