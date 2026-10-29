import { nextDay, parseListingDraft, validateStayDates } from './validation';

describe('mobile validation helpers', () => {
  test('requires checkout after check-in', () => {
    expect(validateStayDates('2026-11-03', '2026-11-03', '2026-10-17')).toBe(
      'Check-out must be after check-in.',
    );
    expect(
      validateStayDates('2026-11-03', '2026-11-04', '2026-10-17'),
    ).toBeNull();
    expect(nextDay('2026-11-03')).toBe('2026-11-04');
  });

  test('keeps listings in Abuja and converts NGN to kobo', () => {
    const result = parseListingDraft({
      title: 'Quiet Wuse apartment',
      description:
        'A calm and comfortable apartment for verified stays in central Abuja.',
      propertyType: 'apartment',
      addressLine: '12 Example Street',
      area: 'Wuse 2',
      city: 'Abuja',
      state: 'FCT',
      country: 'Nigeria',
      bedrooms: '2',
      bathrooms: '2.5',
      maxGuests: '4',
      nightlyRate: '45000.50',
      amenities: 'Wi-Fi\nWorkspace',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      houseRules: 'No parties. Please respect quiet hours.',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in.',
      photos: [{ url: 'https://example.com/a.jpg', alt_text: 'Living room' }],
    });
    expect(result.nightly_rate_kobo).toBe('4500050');
    expect(result.amenities).toHaveLength(2);
  });

  test('rejects a listing outside the launch market', () => {
    expect(() =>
      parseListingDraft({
        title: 'Island apartment',
        description:
          'A long enough property description for the listing validation.',
        propertyType: 'apartment',
        addressLine: '12 Example Street',
        area: 'Ikoyi',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        bedrooms: '1',
        bathrooms: '1',
        maxGuests: '2',
        nightlyRate: '20000',
        amenities: '',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        houseRules: 'No parties. Please respect quiet hours.',
        cancellationPolicy: 'Free cancellation up to 48 hours before check-in.',
        photos: [{ url: 'https://example.com/a.jpg', alt_text: '' }],
      }),
    ).toThrow('Only Abuja / FCT');
  });
});
