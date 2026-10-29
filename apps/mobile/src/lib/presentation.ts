const shortDate = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatStayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? value : shortDate.format(parsed);
}

export function formatStayRange(checkIn: string, checkOut: string) {
  return `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)}`;
}

export function formatEventDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

export type StatusTone = 'neutral' | 'success' | 'warning';

export type BookingStateCopy = {
  label: string;
  title: string;
  body: string;
  tone: StatusTone;
};

function paymentIsComplete(paymentStatus?: string) {
  return ['paid', 'settled'].includes(paymentStatus || '');
}

export function guestBookingState(
  status: string,
  paymentStatus?: string,
  paymentEnabled?: boolean,
): BookingStateCopy {
  if (status === 'pending') {
    return {
      label: 'Awaiting host',
      title: 'The host needs to respond',
      body: 'Your request is pending. No payment has been taken and the dates are not reserved yet.',
      tone: 'warning',
    };
  }

  if (status === 'confirmed') {
    if (paymentIsComplete(paymentStatus)) {
      return {
        label: 'Confirmed and paid',
        title: 'Your stay is confirmed',
        body: 'The host accepted your request, the dates are reserved and payment is recorded.',
        tone: 'success',
      };
    }

    return {
      label:
        paymentEnabled === true
          ? 'Host accepted · payment due'
          : 'Host accepted · payment unavailable in beta',
      title: 'The host accepted your request',
      body:
        paymentEnabled === true
          ? 'The dates are reserved. Complete the available payment step before treating the stay as paid.'
          : 'The dates are reserved. Amount due is shown below, but Fuhara cannot collect payment during beta.',
      tone: 'success',
    };
  }

  if (status === 'checked_in') {
    return {
      label: 'Stay in progress',
      title: 'Your stay is in progress',
      body: 'Use support if you need help during the stay.',
      tone: 'success',
    };
  }

  if (status === 'completed') {
    return {
      label: 'Completed',
      title: 'This stay is complete',
      body: 'You can still contact support about this booking if needed.',
      tone: 'success',
    };
  }

  if (status === 'disputed') {
    return {
      label: 'Under review',
      title: 'Fuhara is reviewing this stay',
      body: 'Follow your support ticket for the latest resolution status.',
      tone: 'warning',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      title: 'This booking is cancelled',
      body: 'The dates are no longer reserved for this booking.',
      tone: 'neutral',
    };
  }

  const label = status.replaceAll('_', ' ');
  return {
    label,
    title: `Booking status: ${label}`,
    body: 'Refresh this booking for the latest status from Fuhara.',
    tone: 'neutral',
  };
}

export function hostBookingState(status: string): BookingStateCopy {
  if (status === 'pending') {
    return {
      label: 'Action required',
      title: 'Accept or decline this request',
      body: 'Pending requests do not reserve dates. Accept only after reviewing the stay details.',
      tone: 'warning',
    };
  }

  if (status === 'confirmed') {
    return {
      label: 'Accepted · dates reserved',
      title: 'You accepted this request',
      body: 'The dates are reserved. Acceptance did not collect payment from the guest.',
      tone: 'success',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      title: 'This request is closed',
      body: 'The dates are not reserved by this booking.',
      tone: 'neutral',
    };
  }

  const label = status.replaceAll('_', ' ');
  return {
    label,
    title: `Booking status: ${label}`,
    body: 'No host decision is available for this booking now.',
    tone:
      status === 'completed' || status === 'checked_in' ? 'success' : 'neutral',
  };
}
