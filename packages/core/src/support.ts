export const supportCategories = [
  'booking',
  'dispute',
  'guest',
  'host',
  'property',
  'payment',
  'technical',
  'other',
] as const;

export type SupportCategory = (typeof supportCategories)[number];

export type SupportTicketInput = {
  category: SupportCategory;
  subject: string;
  description: string;
  bookingId: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSupportTicketInput(
  category: unknown,
  subject: unknown,
  description: unknown,
  bookingId: unknown,
): { ok: true; data: SupportTicketInput } | { ok: false; message: string } {
  if (
    typeof category !== 'string' ||
    !supportCategories.includes(category as SupportCategory)
  ) {
    return { ok: false, message: 'Choose a support category.' };
  }

  const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
  if (cleanSubject.length < 5 || cleanSubject.length > 120) {
    return {
      ok: false,
      message: 'Enter a subject between 5 and 120 characters.',
    };
  }

  const cleanDescription =
    typeof description === 'string' ? description.trim() : '';
  if (cleanDescription.length < 10 || cleanDescription.length > 2000) {
    return {
      ok: false,
      message: 'Describe what happened in 10 to 2,000 characters.',
    };
  }

  const cleanBookingId =
    typeof bookingId === 'string' && bookingId.trim() ? bookingId.trim() : null;
  if (cleanBookingId && !uuidPattern.test(cleanBookingId)) {
    return { ok: false, message: 'Choose a valid booking.' };
  }

  return {
    ok: true,
    data: {
      category: category as SupportCategory,
      subject: cleanSubject,
      description: cleanDescription,
      bookingId: cleanBookingId,
    },
  };
}
