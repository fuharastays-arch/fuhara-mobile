import { useState } from 'react';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { originalImageUrl, type CatalogProperty } from '@fuhara/core/catalog';
import { colors, spacing } from '../theme';

export function PropertyGallery({ property }: { property: CatalogProperty }) {
  const { width } = useWindowDimensions();
  const images = property.images.length
    ? property.images
    : property.cover_image_url
      ? [
          {
            id: 'cover',
            url: property.cover_image_url,
            alt_text: property.title,
            position: 0,
          },
        ]
      : [];
  const [selected, setSelected] = useState<number | null>(null);
  if (!images.length)
    return (
      <View style={[styles.hero, styles.empty, { width }]}>
        <Text style={styles.emptyText}>Verified stay</Text>
      </View>
    );
  return (
    <>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`${item.alt_text || property.title}, image ${index + 1} of ${images.length}`}
            onPress={() => setSelected(index)}
          >
            <Image
              source={{ uri: originalImageUrl(item.url) || item.url }}
              style={[styles.hero, { width }]}
              contentFit="cover"
              transition={220}
            />
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {index + 1} / {images.length}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <Modal
        visible={selected !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close full screen image"
            style={styles.close}
            onPress={() => setSelected(null)}
          >
            <X size={24} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
          {selected !== null ? (
            <Image
              source={{
                uri:
                  originalImageUrl(images[selected].url) ||
                  images[selected].url,
              }}
              style={styles.full}
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { height: 318, backgroundColor: colors.softTeal },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.tealDark, fontWeight: '800', letterSpacing: 2 },
  modal: { flex: 1, backgroundColor: '#071210', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  close: {
    position: 'absolute',
    zIndex: 2,
    top: 55,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: 999,
    backgroundColor: 'rgba(7,38,35,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  counterText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
