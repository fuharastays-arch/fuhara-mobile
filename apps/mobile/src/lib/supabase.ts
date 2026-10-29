import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { publicEnvironment } from './env';
import { secureSessionStorage } from './secure-storage';

export const supabase = createClient(
  publicEnvironment.supabaseUrl,
  publicEnvironment.publishableKey,
  {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'fuhara-mobile-staging/0.7.4' },
    },
  },
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
