import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { publicEnvironment } from './env';

function isExpoGo() {
  return (
    Constants.expoGoConfig != null ||
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

export function installNotificationRouting() {
  let active = true;
  let remove: (() => void) | undefined;

  // Expo Go intentionally omits remote-notification native modules. Loading the
  // package there would prevent Expo Router from evaluating the whole app.
  if (!isExpoGo()) {
    void import('expo-notifications')
      .then((Notifications) => {
        if (!active) return;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        const subscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const path = response.notification.request.content.data?.path;
            if (
              typeof path === 'string' &&
              (path.startsWith('/properties/') || path.startsWith('/booking/'))
            ) {
              router.push(path as never);
            }
          });
        remove = () => subscription.remove();
      })
      .catch(() => {
        // Notifications remain optional until a native development build exists.
      });
  }

  return {
    remove: () => {
      active = false;
      remove?.();
    },
  };
}

export async function preparePushToken() {
  if (isExpoGo()) {
    return { state: 'development_build_required' as const, token: null };
  }
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  if (!Device.isDevice)
    return { state: 'device_required' as const, token: null };
  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === 'granted'
      ? current
      : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted')
    return { state: 'denied' as const, token: null };
  const projectId =
    publicEnvironment.easProjectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') {
    return { state: 'backend_required' as const, token: null };
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  // Deliberately not sent anywhere: STAGING has no reviewed least-privilege registration RPC yet.
  return { state: 'backend_required' as const, token };
}
