import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { colors, spacing } from '../theme';

export default function Onboarding() {
  async function continueToApp() {
    await SecureStore.setItemAsync('fuhara.onboarded', 'yes');
    router.replace('/(tabs)');
  }
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>ABUJA / FCT</Text>
        <Text accessibilityRole="header" style={styles.title}>
          A quieter way to find your next stay.
        </Text>
        <Text style={styles.body}>
          Verified stays. Effortless comfort. Discover approved homes, request
          dates, and follow every booking update from one native app.
        </Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.note}>
          This beta does not collect guest payments or send host payouts.
        </Text>
        <Button label="Explore Abuja stays" onPress={continueToApp} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B2927',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  top: { paddingTop: 70, gap: spacing.md },
  eyebrow: { color: colors.teal, fontWeight: '900', letterSpacing: 2 },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  body: { color: '#D8E7E5', fontSize: 18, lineHeight: 28 },
  bottom: { gap: spacing.md, paddingBottom: spacing.lg },
  note: { color: '#AAC6C2', fontSize: 13, lineHeight: 19 },
});
