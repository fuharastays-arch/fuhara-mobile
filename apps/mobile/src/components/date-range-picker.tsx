import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatStayDate } from '../lib/presentation';
import { colors, radius, spacing } from '../theme';

function fromKey(value: string, fallback: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return new Date(`${value}T12:00:00`);
}

function keyFrom(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayAfter(value: string) {
  const date = fromKey(value, new Date());
  date.setDate(date.getDate() + 1);
  return date;
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  minimumDate = new Date(),
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  minimumDate?: Date;
}) {
  function chooseCheckout(start: string) {
    const earliest = dayAfter(start);
    DateTimePickerAndroid.open({
      value: fromKey(checkOut, earliest),
      minimumDate: earliest,
      mode: 'date',
      onChange: (event, selected) => {
        if (event.type !== 'set' || !selected) return;
        onChange(start, keyFrom(selected));
      },
    });
  }

  function chooseCheckIn() {
    DateTimePickerAndroid.open({
      value: fromKey(checkIn, minimumDate),
      minimumDate,
      mode: 'date',
      onChange: (event, selected) => {
        if (event.type !== 'set' || !selected) return;
        const start = keyFrom(selected);
        const end = checkOut > start ? checkOut : '';
        onChange(start, end);
        setTimeout(() => chooseCheckout(start), 180);
      },
    });
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose check-in and check-out dates"
        style={styles.range}
        onPress={chooseCheckIn}
      >
        <CalendarDays size={20} color={colors.tealDark} strokeWidth={2.2} />
        <View style={styles.copy}>
          <Text style={styles.label}>WHEN</Text>
          <Text style={styles.value}>
            {checkIn && checkOut
              ? `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)}`
              : 'Choose dates'}
          </Text>
        </View>
      </Pressable>
      {checkIn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change check-out date"
          style={styles.change}
          onPress={() => chooseCheckout(checkIn)}
        >
          <Text style={styles.changeText}>Change check-out</Text>
        </Pressable>
      ) : null}
      <Text style={styles.hint}>Check-out starts the day after check-in.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  range: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  copy: { flex: 1 },
  label: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: 2 },
  change: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  changeText: { color: colors.tealDark, fontSize: 12, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 11 },
});
