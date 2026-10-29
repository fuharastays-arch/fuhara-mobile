import { useEffect } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function Splash() {
  useEffect(() => {
    SecureStore.getItemAsync('fuhara.onboarded').then((value) => {
      router.replace(value === 'yes' ? '/(tabs)' : '/onboarding');
    });
  }, []);
  return (
    <View style={styles.root} accessibilityLabel="Fuhara is loading">
      <Text style={styles.brand}>FUHARA</Text>
      <Text style={styles.motto}>Verified stays. Effortless comfort.</Text>
      <Text style={styles.stage}>ABUJA / FCT BETA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B2927',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  brand: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 34,
    letterSpacing: 6,
  },
  motto: { color: '#D7ECE9', fontSize: 16 },
  stage: {
    color: colors.teal,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 18,
  },
});
