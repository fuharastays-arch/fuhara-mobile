import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const chunkSize = 1800;
const keyPrefix = 'fuhara.session.';

function safeKey(key: string) {
  return `${keyPrefix}${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function removeNative(key: string) {
  const base = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${base}.count`)) || 0;
  await Promise.all([
    SecureStore.deleteItemAsync(`${base}.count`),
    ...Array.from({ length: count }, (_, index) =>
      SecureStore.deleteItemAsync(`${base}.${index}`),
    ),
  ]);
}

export const secureSessionStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web')
      return globalThis.localStorage?.getItem(key) ?? null;
    const base = safeKey(key);
    const count = Number(await SecureStore.getItemAsync(`${base}.count`)) || 0;
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(`${base}.${index}`),
      ),
    );
    return chunks.every((chunk) => chunk !== null) ? chunks.join('') : null;
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await removeNative(key);
    const base = safeKey(key);
    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) ?? [''];
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${base}.${index}`, chunk),
      ),
    );
    await SecureStore.setItemAsync(`${base}.count`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await removeNative(key);
  },
};
