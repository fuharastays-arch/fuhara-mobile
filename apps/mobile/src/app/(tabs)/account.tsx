import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  Building2,
  ChevronRight,
  Headphones,
  Heart,
  Luggage,
  PenLine,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Field,
  Loading,
  Notice,
  Screen,
} from '../../components/ui';
import { loadAccountContext, updateProfile } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { preparePushToken } from '../../lib/notifications';
import { useSession } from '../../lib/session';
import type { HostContext } from '../../lib/types';
import { colors, radius, spacing } from '../../theme';

function MenuRow({
  icon: Icon,
  title,
  detail,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.menuIcon}>
        <Icon size={20} color={colors.ink} strokeWidth={2} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { user, loading: sessionLoading, signOut } = useSession();
  const [context, setContext] = useState<HostContext | null>(null);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const result = await loadAccountContext();
      setContext(result);
      setFirst(result.profile?.first_name || '');
      setLast(result.profile?.last_name || '');
      setPhone(result.profile?.phone || '');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [user]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      await updateProfile(first, last, phone);
      await load();
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function notifications() {
    setBusy(true);
    try {
      const result = await preparePushToken();
      setMessage(
        result.state === 'denied'
          ? 'Notification permission was not granted.'
          : result.state === 'device_required'
            ? 'Use a physical device to register for remote push notifications.'
            : result.state === 'development_build_required'
              ? 'Remote push notifications require a native development build; Expo Go can still test the rest of the app.'
              : 'Notifications are not available yet. You can still follow booking updates in Trips.',
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (sessionLoading || loading)
    return <Loading label="Preparing your profile…" />;

  if (!user)
    return (
      <Screen contentStyle={styles.signedOutScreen}>
        <View style={styles.signedOutHero}>
          <Text style={styles.wordmarkLight}>FUHARA</Text>
          <View style={styles.guestAvatar}>
            <UserRound size={36} color="#B8E5E1" strokeWidth={1.7} />
          </View>
          <Text style={styles.signedOutEyebrow}>YOUR FUHARA</Text>
          <Text accessibilityRole="header" style={styles.signedOutTitle}>
            A more personal way to stay.
          </Text>
          <Text style={styles.signedOutBody}>
            Save your profile, request verified homes, and keep every trip in
            one calm place.
          </Text>
        </View>
        <View style={styles.signedOutActions}>
          <Button
            label="Sign in"
            onPress={() => router.push('/auth/sign-in')}
          />
          <Button
            kind="secondary"
            label="Create an account"
            onPress={() => router.push('/auth/sign-up')}
          />
          <Text style={styles.stageNote}>
            BETA · Payments and payouts are unavailable
          </Text>
        </View>
      </Screen>
    );

  const displayName = [first, last].filter(Boolean).join(' ') || 'Fuhara guest';
  const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || 'FG';

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>FUHARA</Text>
          <Text style={styles.stage}>YOUR PROFILE</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>
      <View style={styles.identity}>
        <Text style={styles.eyebrow}>WELCOME BACK</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {displayName}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.membership}>
          <Text style={styles.membershipText}>
            {context?.account?.is_host
              ? `Host · ${context.host?.kyc_status === 'verified' ? 'Identity verified' : 'Verification in progress'}`
              : 'Fuhara guest'}
          </Text>
        </View>
      </View>
      {message ? (
        <Notice tone={message.includes('updated') ? 'success' : 'info'}>
          {message}
        </Notice>
      ) : null}

      <Card style={styles.profileCard}>
        <View style={styles.cardHeading}>
          <View>
            <Text style={styles.cardEyebrow}>PERSONAL DETAILS</Text>
            <Text style={styles.cardTitle}>Your profile</Text>
          </View>
          <PenLine size={21} color={colors.muted} strokeWidth={2} />
        </View>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Field label="First name" value={first} onChangeText={setFirst} />
          </View>
          <View style={styles.nameField}>
            <Field label="Last name" value={last} onChangeText={setLast} />
          </View>
        </View>
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Button
          label={busy ? 'Saving…' : 'Save changes'}
          onPress={save}
          disabled={busy}
        />
      </Card>

      <View style={styles.section}>
        <Text style={styles.cardEyebrow}>YOUR FUHARA</Text>
        <View style={styles.menu}>
          <MenuRow
            icon={Luggage}
            title="Trips"
            detail="Bookings, requests, and stay history"
            onPress={() => router.push('/(tabs)/bookings')}
          />
          <MenuRow
            icon={Heart}
            title="Favorites"
            detail="Saved apartments across your devices"
            onPress={() => router.push('/favorites' as never)}
          />
          <MenuRow
            icon={Building2}
            title="Hosting"
            detail="Listings and host readiness"
            onPress={() => router.push('/host')}
          />
          <MenuRow
            icon={Headphones}
            title="Support"
            detail="Help from the Fuhara team"
            onPress={() => router.push('/support')}
          />
          <MenuRow
            icon={Bell}
            title="Notifications"
            detail="Prepare booking updates on this device"
            onPress={notifications}
          />
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusMark}>
          <ShieldCheck size={19} color={colors.tealDark} strokeWidth={2.2} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>Account status</Text>
          <Text style={styles.statusDetail}>
            {context?.account?.status || 'Profile setup required'} · secured by
            Your account and saved stays remain protected
          </Text>
        </View>
      </View>
      <Button
        kind="secondary"
        label="Sign out"
        onPress={async () => {
          await signOut();
          router.replace('/(tabs)/account');
        }}
      />
      <Text style={styles.footer}>
        FUHARA · VERIFIED STAYS, EFFORTLESS COMFORT
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, paddingBottom: 110, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 3.5,
  },
  stage: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  identity: { gap: 5, paddingVertical: spacing.sm },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.ink,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  email: { color: colors.muted, fontSize: 14 },
  membership: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  membershipText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  profileCard: { padding: spacing.lg },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 4,
  },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameField: { flex: 1 },
  section: { gap: spacing.sm },
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1, marginLeft: 12 },
  menuTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  menuDetail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    gap: spacing.sm,
  },
  statusMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D7F0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  statusDetail: {
    color: '#C7DFDC',
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'capitalize',
  },
  footer: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  signedOutScreen: {
    padding: 0,
    paddingBottom: 0,
    gap: 0,
    flexGrow: 1,
    backgroundColor: colors.tealDeep,
  },
  signedOutHero: {
    flex: 1,
    minHeight: 510,
    padding: spacing.lg,
    paddingTop: 40,
    justifyContent: 'center',
  },
  wordmarkLight: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3.5,
  },
  guestAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: '#78C8C1',
    backgroundColor: 'rgba(14,163,154,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  signedOutEyebrow: {
    color: '#8ED6D0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  signedOutTitle: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 47,
    fontWeight: '800',
    letterSpacing: -1.4,
    marginTop: spacing.sm,
  },
  signedOutBody: {
    color: '#C9DDDA',
    fontSize: 16,
    lineHeight: 25,
    marginTop: spacing.md,
  },
  signedOutActions: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  stageNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
