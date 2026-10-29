import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('hides Android unknown-host details behind a useful offline message', () => {
    expect(
      errorMessage({
        message:
          'Error: fetch failed: java.net.UnknownHostException: Unable to resolve host "staging.example": No address associated with hostname',
      }),
    ).toBe('You appear to be offline. Check your connection and try again.');
  });

  it('keeps actionable non-network errors', () => {
    expect(errorMessage({ message: 'Those dates are unavailable.' })).toBe(
      'Those dates are unavailable.',
    );
  });
});
