export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    if (
      /Failed to fetch|fetch failed|Network request failed|UnknownHostException|Unable to resolve host|ERR_NETWORK|\bE(?:CONN|HOSTUNREACH|NETUNREACH)/i.test(
        message,
      )
    ) {
      return 'You appear to be offline. Check your connection and try again.';
    }
    return message;
  }
  return fallback;
}

export function bookingError(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  const message = errorMessage(error);
  if (code === '23P01' || /conflict|reserved|available/i.test(message)) {
    return 'Those dates are no longer available. Choose another stay period.';
  }
  if (/own property|self/i.test(message)) {
    return 'Hosts cannot book their own property.';
  }
  if (code === '22023')
    return 'Check the dates and guest count, then try again.';
  if (code === '42501')
    return 'Sign in with an active guest account to request this stay.';
  return message;
}

export function hostDecisionError(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  if (code === '23P01')
    return 'Those dates are no longer available. The request remains pending.';
  if (code === '40001')
    return 'This request was already decided. Refresh for its current state.';
  if (code === '42501' || code === 'P0002')
    return 'You cannot manage this booking request.';
  if (code === '22023')
    return 'Provide a decline reason between 5 and 500 characters.';
  return errorMessage(error, 'The booking decision could not be saved.');
}
