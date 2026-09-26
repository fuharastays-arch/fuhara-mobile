'use client';
import { useState } from 'react';
import { estimateStay, money } from '@fuhara/core/catalog';
export function StayPlanner({
  rateKobo,
  maxGuests,
  today,
}: {
  rateKobo: number;
  maxGuests: number;
  today: string;
}) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const result = estimateStay(
    { checkIn, checkOut, guests, maxGuests, rateKobo },
    today,
  );
  return (
    <aside
      className="panel stay-planner"
      aria-labelledby="stay-planner-heading"
    >
      <p className="eyebrow">MAKE ROOM FOR YOUR NEXT CHAPTER</p>
      <h2 id="stay-planner-heading">Plan your stay.</h2>
      <p>
        <strong>{money(rateKobo)}</strong> / night
      </p>
      <div className="form">
        <label>
          Check-in
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
        <label>
          Guests
          <input
            type="number"
            min={1}
            max={maxGuests}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="estimate" aria-live="polite">
        {result.ok ? (
          <>
            <p>
              {result.nights} {result.nights === 1 ? 'night' : 'nights'} ×{' '}
              {money(rateKobo)}
            </p>
            <p className="estimate-total">
              Nightly subtotal <strong>{money(result.subtotalKobo)}</strong>
            </p>
            <small>
              Estimate only. Fees and taxes are not included; the final price is
              not yet available.
            </small>
          </>
        ) : (
          <p>{result.message}</p>
        )}
      </div>
      <p className="notice">
        Availability is not yet confirmed. Selecting dates does not hold or
        reserve this stay.
      </p>
      <button className="button" disabled aria-describedby="booking-status">
        Booking coming soon
      </button>
      <p id="booking-status" className="caption">
        Reservations and payments are not open yet.
      </p>
    </aside>
  );
}
