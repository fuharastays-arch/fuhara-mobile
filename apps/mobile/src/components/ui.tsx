import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
} from 'lucide-react-native';
import { colors, radius, spacing } from '../theme';

export function Screen({
  children,
  refreshControl,
  contentStyle,
}: PropsWithChildren<{
  refreshControl?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.screen, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl as never}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function FormScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

export function Subtitle({ children }: PropsWithChildren) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Notice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'error' | 'success' | 'warning' }>) {
  const background =
    tone === 'error'
      ? '#FCECEB'
      : tone === 'success'
        ? '#EAF7EF'
        : tone === 'warning'
          ? '#FFF7E7'
          : colors.softTeal;
  const NoticeIcon =
    tone === 'error'
      ? CircleAlert
      : tone === 'success'
        ? CheckCircle2
        : tone === 'warning'
          ? AlertTriangle
          : Info;
  const iconColor =
    tone === 'error'
      ? colors.danger
      : tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.warning
          : colors.tealDark;
  return (
    <View
      style={[styles.notice, { backgroundColor: background }]}
      accessibilityLiveRegion="polite"
    >
      <NoticeIcon size={19} color={iconColor} strokeWidth={2.1} />
      <Text
        style={[
          styles.noticeText,
          tone === 'error' && { color: colors.danger },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  kind = 'primary',
  accessibilityLabel,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'danger';
  accessibilityLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && !disabled && { opacity: 0.8 },
      ]}
    >
      <View style={styles.buttonContent}>
        {icon}
        <Text
          style={[
            styles.buttonText,
            kind === 'secondary' && styles.buttonSecondaryText,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  multiline,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#879895"
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View
      style={styles.center}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={colors.teal} size="large" />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <Text style={styles.body}>{body}</Text>
      {action}
    </Card>
  );
}

export function StatusPill({
  children,
  tone = 'neutral',
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' }>) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'success' && styles.pillSuccess,
        tone === 'warning' && styles.pillWarning,
      ]}
    >
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  screen: { padding: spacing.md, paddingBottom: 120, gap: spacing.md },
  eyebrow: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.4,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notice: {
    borderRadius: radius.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeText: { color: colors.ink, fontSize: 16, lineHeight: 24, flex: 1 },
  button: {
    minHeight: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSecondaryText: { color: colors.ink },
  field: { gap: spacing.xs },
  label: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  center: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: '#EEF2F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillSuccess: { backgroundColor: '#E2F5EA' },
  pillWarning: { backgroundColor: '#FFF2D6' },
  pillText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  link: { color: colors.tealDark, fontWeight: '700' },
});

export const textStyles = {
  body: styles.body,
  muted: styles.subtitle,
  link: styles.link,
};
