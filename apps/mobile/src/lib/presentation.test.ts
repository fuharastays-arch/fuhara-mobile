import {
  formatEventDateTime,
  formatStayDate,
  formatStayRange,
  guestBookingState,
  hostBookingState,
} from './presentation';

describe('presentation helpers', () => {
  it('presents ISO stay dates without changing invalid input', () => {
    expect(formatStayDate('2026-12-10')).toBe('10 Dec 2026');
    expect(formatStayRange('2026-12-10', '2026-12-13')).toBe(
      '10 Dec 2026 – 13 Dec 2026',
    );
    expect(formatStayDate('not-a-date')).toBe('not-a-date');
  });

  it('returns malformed event timestamps unchanged', () => {
    expect(formatEventDateTime('not-a-date')).toBe('not-a-date');
  });

  it('separates a pending request from a confirmed and paid booking', () => {
    expect(guestBookingState('pending')).toMatchObject({
      label: 'Awaiting host',
      tone: 'warning',
    });
    expect(guestBookingState('confirmed', 'unpaid', false)).toMatchObject({
      label: 'Host accepted · payment unavailable in beta',
      tone: 'success',
    });
    expect(guestBookingState('confirmed', 'paid', true)).toMatchObject({
      label: 'Confirmed and paid',
      tone: 'success',
    });
  });

  it('tells a host when a manual decision is required', () => {
    expect(hostBookingState('pending')).toMatchObject({
      label: 'Action required',
      tone: 'warning',
    });
    expect(hostBookingState('confirmed')).toMatchObject({
      label: 'Accepted · dates reserved',
      tone: 'success',
    });
  });
});
