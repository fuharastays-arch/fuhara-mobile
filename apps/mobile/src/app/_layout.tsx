import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { SessionProvider } from '../lib/session';
import { FavoritesProvider } from '../lib/favorites';
import { installNotificationRouting } from '../lib/notifications';
import { colors } from '../theme';

function AppBackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace('/(tabs)')
      }
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <ArrowLeft size={26} color={colors.ink} strokeWidth={2} />
    </Pressable>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const subscription = installNotificationRouting();
    return () => subscription.remove();
  }, []);
  return (
    <SessionProvider>
      <FavoritesProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.ink,
            headerBackVisible: false,
            headerLeft: () => <AppBackButton />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.canvas },
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="auth/sign-in"
            options={{ title: 'Sign in', presentation: 'modal' }}
          />
          <Stack.Screen
            name="auth/sign-up"
            options={{ title: 'Create account', presentation: 'modal' }}
          />
          <Stack.Screen
            name="auth/forgot-password"
            options={{ title: 'Reset password', presentation: 'modal' }}
          />
          <Stack.Screen
            name="auth/reset-password"
            options={{ title: 'Choose new password', presentation: 'modal' }}
          />
          <Stack.Screen
            name="properties/[id]"
            options={{ title: 'Stay details' }}
          />
          <Stack.Screen
            name="booking/[id]"
            options={{ title: 'Booking details' }}
          />
          <Stack.Screen
            name="support/index"
            options={{ title: 'Fuhara support' }}
          />
          <Stack.Screen
            name="host/kyc"
            options={{ title: 'Host verification' }}
          />
          <Stack.Screen
            name="host/index"
            options={{ title: 'Host workspace' }}
          />
          <Stack.Screen
            name="host/payouts"
            options={{ title: 'Payout readiness' }}
          />
          <Stack.Screen
            name="host/listings/new"
            options={{ title: 'New property' }}
          />
          <Stack.Screen
            name="host/listings/[id]"
            options={{ title: 'Manage property' }}
          />
          <Stack.Screen
            name="host/bookings/[id]"
            options={{ title: 'Booking request' }}
          />
        </Stack>
      </FavoritesProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  pressed: { opacity: 0.55 },
});
