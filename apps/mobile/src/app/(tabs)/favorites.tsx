import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CatalogProperty } from '@fuhara/core/catalog';
import { PropertyCard } from '../../components/property-card';
import { Button, Loading, Notice } from '../../components/ui';
import { loadFavoriteProperties } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useFavorites } from '../../lib/favorites';
import { useSession } from '../../lib/session';
import { colors, spacing } from '../../theme';

export default function FavoritesScreen() {
  const { user, loading: sessionLoading } = useSession();
  const { ids, refresh: refreshIds } = useFavorites();
  const [items, setItems] = useState<CatalogProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setMessage('');
      try {
        await refreshIds();
        const collected: CatalogProperty[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 50) {
          const result = await loadFavoriteProperties(page);
          collected.push(...result.items);
          hasMore = result.has_more;
          page += 1;
        }
        setItems(collected);
      } catch (error) {
        setMessage(errorMessage(error, 'Favorites could not be loaded.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshIds, user],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (sessionLoading || loading) return <Loading label="Loading favorites…" />;

  if (!user)
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.signedOut}>
          <View style={styles.emptyIcon}>
            <Heart size={28} color={colors.tealDark} strokeWidth={2} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Keep the stays you love close.
          </Text>
          <Text style={styles.subtitle}>
            Sign in to save apartments and find them again on any device.
          </Text>
          <Button
            label="Sign in"
            onPress={() => router.push('/auth/sign-in')}
          />
        </View>
      </SafeAreaView>
    );

  const visibleItems = items.filter((item) => ids.has(item.id));
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PropertyCard property={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.teal}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>SAVED FOR LATER</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Favorites
            </Text>
            <Text style={styles.subtitle}>
              Saved stays sync with your Fuhara account.
            </Text>
            {message ? <Notice tone="error">{message}</Notice> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Heart size={28} color={colors.tealDark} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyBody}>
              Save stays you love and find them here.
            </Text>
            <Button
              kind="secondary"
              label="Explore stays"
              onPress={() => router.push('/(tabs)/search')}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  list: { padding: spacing.md, paddingBottom: 120, flexGrow: 1 },
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  empty: { flex: 1, minHeight: 360, justifyContent: 'center', gap: spacing.sm },
  signedOut: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.softTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
