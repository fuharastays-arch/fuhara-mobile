import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Heart } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useFavorites } from '../lib/favorites';
import { useSession } from '../lib/session';
import { colors, shadow } from '../theme';

export function FavoriteButton({
  propertyId,
  onError,
  size = 22,
}: {
  propertyId: string;
  onError?: (error: unknown) => void;
  size?: number;
}) {
  const { user } = useSession();
  const { ids, isBusy, toggle } = useFavorites();
  const saved = ids.has(propertyId);
  const busy = isBusy(propertyId);

  async function press() {
    if (!user) {
      router.push({
        pathname: '/auth/sign-in',
        params: { favorite: propertyId },
      });
      return;
    }
    try {
      await toggle(propertyId);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      onError?.(error);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from favorites' : 'Save to favorites'}
      accessibilityState={{ selected: saved, disabled: busy }}
      disabled={busy}
      hitSlop={8}
      onPress={press}
      style={({ pressed }) => [
        styles.button,
        saved && styles.buttonSaved,
        pressed && { transform: [{ scale: 0.94 }] },
        busy && { opacity: 0.55 },
      ]}
    >
      <Heart
        size={size}
        color={saved ? '#FFFFFF' : colors.ink}
        fill={saved ? '#FFFFFF' : 'transparent'}
        strokeWidth={2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...shadow,
  },
  buttonSaved: { backgroundColor: colors.teal },
});
