import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  UsersRound,
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
  propertyTypes,
  type CatalogProperty,
} from '@fuhara/core/catalog';
import { PropertyCard } from '../../components/property-card';
import { DateRangePicker } from '../../components/date-range-picker';
import { Empty, Loading, Notice } from '../../components/ui';
import { loadCatalog } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing } from '../../theme';

const first = (value: string | string[] | undefined, fallback: string) =>
  Array.isArray(value) ? value[0] || fallback : value || fallback;

export default function SearchResults() {
  const params = useLocalSearchParams<{
    destination?: string | string[];
    guests?: string | string[];
    checkIn?: string | string[];
    checkOut?: string | string[];
  }>();
  const [items, setItems] = useState<CatalogProperty[]>([]);
  const [query, setQuery] = useState(() => first(params.destination, 'Abuja'));
  const [guests, setGuests] = useState(() => Math.min(100, Math.max(1, Number(first(params.guests, '1')) || 1)));
  const [checkIn, setCheckIn] = useState(() => first(params.checkIn, ''));
  const [checkOut, setCheckOut] = useState(() => first(params.checkOut, ''));
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchCatalog = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setMessage('');
      try {
        const filters = parseFilters({
          destination: query || 'Abuja',
          guests: String(guests),
          checkIn,
          checkOut,
          type,
          sort,
          maxPrice,
          page: '1',
        });
        setItems((await loadCatalog(filters)).items);
      } catch (error) {
        setMessage(errorMessage(error, 'Stays could not be loaded.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [checkIn, checkOut, guests, maxPrice, query, sort, type],
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchCatalog(), 280);
    return () => clearTimeout(timer);
  }, [fetchCatalog]);

  const sortLabel =
    sort === 'price_low'
      ? 'Lowest price'
      : sort === 'price_high'
        ? 'Highest price'
        : 'Newest';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PropertyCard property={item} search={{ checkIn, checkOut, guests }} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCatalog(true)}
            tintColor={colors.teal}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>ABUJA / FCT</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Find your stay
              </Text>
              <Text style={styles.subtitle}>
                Where, when, and who is coming.
              </Text>
            </View>

            <View style={styles.searchPanel}>
              <View style={styles.destinationRow}>
                <Search size={21} color={colors.tealDark} strokeWidth={2.2} />
                <View style={styles.destinationCopy}>
                  <Text style={styles.fieldLabel}>WHERE</Text>
                  <TextInput
                    accessibilityLabel="Where do you want to stay?"
                    style={styles.searchInput}
                    placeholder="Area or property name"
                    placeholderTextColor={colors.muted}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                  />
                </View>
              </View>
              <View style={styles.rule} />
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(start, end) => {
                  setCheckIn(start);
                  setCheckOut(end);
                }}
              />
              <View style={styles.planningRow}>
                <View style={styles.planItem}>
                  <UsersRound size={18} color={colors.ink} strokeWidth={2} />
                  <View style={styles.planCopy}>
                    <Text style={styles.fieldLabel}>GUESTS</Text>
                    <View style={styles.stepper}>
                      <Pressable accessibilityLabel="Remove a guest" disabled={guests <= 1} onPress={() => setGuests(Math.max(1, guests - 1))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable>
                      <Text style={styles.guestValue}>{guests}</Text>
                      <Pressable accessibilityLabel="Add a guest" disabled={guests >= 100} onPress={() => setGuests(Math.min(100, guests + 1))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen((open) => !open)} style={styles.filtersHeading}>
              <View style={styles.filtersLabel}>
                <SlidersHorizontal
                  size={18}
                  color={colors.ink}
                  strokeWidth={2}
                />
                <Text style={styles.filtersTitle}>{filtersOpen ? 'Hide filters' : 'Filters'}</Text>
              </View>
            </Pressable>
            {filtersOpen ? <>
              <View style={styles.maxPrice}>
                <Text style={styles.fieldLabel}>MAX / NIGHT</Text>
                <TextInput
                  accessibilityLabel="Maximum nightly price in naira"
                  style={styles.priceInput}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="number-pad"
                  placeholder="Any price"
                  placeholderTextColor={colors.muted}
                />
              </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <FilterChip
                label="All stays"
                active={!type}
                onPress={() => setType('')}
              />
              {propertyTypes.slice(0, 6).map((value) => (
                <FilterChip
                  key={value}
                  label={value.replaceAll('_', ' ')}
                  active={type === value}
                  onPress={() => setType(value)}
                />
              ))}
            </ScrollView>
            </> : null}

            <View style={styles.resultBar}>
              <Text style={styles.resultText}>
                {loading
                  ? 'Finding considered stays…'
                  : `${items.length} ${items.length === 1 ? 'stay' : 'stays'}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${sortLabel}`}
                style={styles.sort}
                onPress={() =>
                  setSort(
                    sort === 'newest'
                      ? 'price_low'
                      : sort === 'price_low'
                        ? 'price_high'
                        : 'newest',
                  )
                }
              >
                <ArrowUpDown
                  size={16}
                  color={colors.tealDark}
                  strokeWidth={2}
                />
                <Text style={styles.sortText}>{sortLabel}</Text>
              </Pressable>
            </View>
            {message ? <Notice tone="error">{message}</Notice> : null}
            {loading ? <Loading label="Finding the right stays…" /> : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Empty
              title="No matching stays"
              body="Try a nearby Abuja area, fewer guests, or a wider price range."
            />
          ) : (
            <></>
          )
        }
      />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  list: { padding: spacing.md, paddingBottom: 120, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  eyebrow: {
    color: colors.muted,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 4 },
  searchPanel: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  destinationRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationCopy: { flex: 1 },
  fieldLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  searchInput: {
    minHeight: 30,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    paddingVertical: 2,
  },
  rule: { height: 1, backgroundColor: colors.line },
  planningRow: { flexDirection: 'row', gap: 8 },
  planItem: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
  },
  planCopy: { flex: 1, minWidth: 0 },
  planValue: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  planInput: {
    color: colors.ink,
    minHeight: 22,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  stepButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.ink, fontSize: 20, lineHeight: 22, fontWeight: '800' },
  guestValue: { minWidth: 26, textAlign: 'center', color: colors.ink, fontSize: 15, fontWeight: '900' },
  filtersHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filtersLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  filtersTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  maxPrice: {
    minWidth: 116,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  priceInput: {
    color: colors.ink,
    minHeight: 30,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
  },
  chips: { gap: spacing.xs, paddingRight: spacing.md },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 15,
  },
  chipActive: {
    backgroundColor: colors.tealDeep,
    borderColor: colors.tealDeep,
  },
  chipText: {
    color: colors.ink,
    textTransform: 'capitalize',
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextActive: { color: '#FFFFFF' },
  resultBar: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  sort: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.sm,
  },
  sortText: { color: colors.tealDark, fontWeight: '800', fontSize: 12 },
});
