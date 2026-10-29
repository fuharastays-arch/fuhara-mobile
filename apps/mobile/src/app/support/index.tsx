import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { supportCategories } from '@fuhara/core/support';
import {
  Button,
  Card,
  Field,
  FormScreen,
  Loading,
  Notice,
  SectionTitle,
  Subtitle,
  Title,
  textStyles,
} from '../../components/ui';
import {
  createSupportTicket,
  loadSupportBookingOptions,
  loadSupportTickets,
} from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatStayDate } from '../../lib/presentation';
import type { SupportTicket } from '../../lib/types';
import { colors } from '../../theme';

export default function Support() {
  const params = useLocalSearchParams<{
    category?: string;
    bookingId?: string;
  }>();
  const [category, setCategory] = useState(params.category || 'booking');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [bookings, setBookings] = useState<
    Awaited<ReturnType<typeof loadSupportBookingOptions>>['items']
  >([]);
  const [bookingId, setBookingId] = useState(params.bookingId || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketResult, bookingResult] = await Promise.all([
        loadSupportTickets(),
        loadSupportBookingOptions(),
      ]);
      setTickets(ticketResult.items);
      setBookings(bookingResult.items);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      await createSupportTicket(
        category,
        subject,
        description,
        bookingId || null,
      );
      setSubject('');
      setDescription('');
      setMessage('Your support request was sent.');
      await load();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading label="Loading support…" />;
  return (
    <FormScreen>
      <Title>Support that stays with you.</Title>
      <Subtitle>Create a request or review your recent tickets.</Subtitle>
      <Notice>
        For a time-sensitive check-in problem, attach the stay and put
        “Time-sensitive stay issue” in the subject. Fuhara does not currently
        offer a 24/7 phone line.
      </Notice>
      <Card>
        <SectionTitle>Quick help</SectionTitle>
        <Text style={textStyles.body}>Pending requests do not reserve dates or collect payment.</Text>
        <Text style={textStyles.body}>Payment collection is unavailable during beta.</Text>
        <Text style={textStyles.body}>Hosts can attach a hosted booking below when asking for help.</Text>
      </Card>
      {message ? (
        <Notice tone={message.includes('sent') ? 'success' : 'error'}>
          {message}
        </Notice>
      ) : null}
      <Card>
        <SectionTitle>New request</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {supportCategories.map((value) => (
            <Pressable
              key={value}
              onPress={() => setCategory(value)}
              style={{
                padding: 9,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: category === value ? colors.teal : colors.line,
                backgroundColor: category === value ? colors.softTeal : '#fff',
              }}
            >
              <Text style={{ textTransform: 'capitalize' }}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={textStyles.muted}>Related booking (optional)</Text>
        {bookingId ? (
          <Notice>
            Attached: {bookings.find((booking) => booking.booking_id === bookingId)
              ? `#${bookings.find((booking) => booking.booking_id === bookingId)!.booking_number} · ${bookings.find((booking) => booking.booking_id === bookingId)!.property_name}`
              : 'booking selected from your stay'}
          </Notice>
        ) : null}
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setBookingId('')} style={{ padding: 10, borderWidth: 1, borderColor: !bookingId ? colors.teal : colors.line, borderRadius: 10 }}>
            <Text>No booking selected</Text>
          </Pressable>
          {bookings.map((booking) => (
            <Pressable key={booking.booking_id} onPress={() => setBookingId(booking.booking_id)} style={{ padding: 10, borderWidth: 1, borderColor: bookingId === booking.booking_id ? colors.teal : colors.line, borderRadius: 10 }}>
              <Text style={textStyles.body}>{booking.role === 'host' ? 'Hosting' : 'Trip'} #{booking.booking_number} · {booking.property_name}</Text>
              <Text style={textStyles.muted}>{formatStayDate(booking.check_in)}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Subject" value={subject} onChangeText={setSubject} />
        <Field
          label="What happened?"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Button
          label={busy ? 'Sending…' : 'Send to support'}
          onPress={submit}
          disabled={busy}
        />
      </Card>
      <SectionTitle>Recent tickets</SectionTitle>
      {tickets.length ? (
        tickets.map((ticket) => (
          <Card key={ticket.id}>
            <Text style={textStyles.muted}>
              #{ticket.ticket_number} · {ticket.status}
            </Text>
            <Text style={textStyles.body}>{ticket.subject}</Text>
          </Card>
        ))
      ) : (
        <Notice>No support requests yet.</Notice>
      )}
    </FormScreen>
  );
}
