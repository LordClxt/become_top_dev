export type Room = 'single' | 'double' | 'suite';

/** Forme acceptée en entrée : large. */
export interface BookingInput {
  checkIn: Date | string;
  checkOut: Date | string;
  guests: number | string;
  room: string;
  email?: string;
  phone?: string;
}

/** Forme canonique produite : stricte. */
export interface Booking {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  room: Room;
  contact?: { email?: string; phone?: string };
}

const DAY_MS = 86_400_000;

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) throw new Error(`date invalide : ${value}`);
  return date;
}

function toGuests(value: number | string): number {
  const guests = typeof value === 'number' ? value : /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(guests) || guests < 1 || guests > 4) throw new Error('nombre de personnes invalide');
  return guests;
}

function isRoom(value: string): value is Room {
  return value === 'single' || value === 'double' || value === 'suite';
}

function toRoom(value: string): Room {
  const room = value.trim().toLowerCase();
  if (!isRoom(room)) throw new Error(`chambre inconnue : ${value}`);
  return room;
}

export function normalize(input: BookingInput): Booking {
  const checkIn = toDate(input.checkIn);
  const checkOut = toDate(input.checkOut);
  if (checkOut.getTime() <= checkIn.getTime()) throw new Error('séjour invalide');
  const email = input.email?.trim() || undefined;
  const phone = input.phone?.trim() || undefined;
  return {
    checkIn,
    checkOut,
    guests: toGuests(input.guests),
    room: toRoom(input.room),
    ...(email || phone ? { contact: { ...(email ? { email } : {}), ...(phone ? { phone } : {}) } } : {}),
  };
}

export function nightCount(booking: Booking): number {
  return Math.round((booking.checkOut.getTime() - booking.checkIn.getTime()) / DAY_MS);
}

export function priceEur(booking: Booking, nightlyRateEur: Readonly<Record<Room, number>>): number {
  const extraGuests = Math.max(0, booking.guests - 2);
  return (nightlyRateEur[booking.room] + 10 * extraGuests) * nightCount(booking);
}

export function occupancy(bookings: Iterable<Booking>): [Date, Date] | null {
  let span: [Date, Date] | null = null;
  for (const { checkIn, checkOut } of bookings) {
    if (!span) {
      span = [checkIn, checkOut];
    } else {
      const [first, last]: [Date, Date] = span;
      span = [checkIn < first ? checkIn : first, checkOut > last ? checkOut : last];
    }
  }
  return span;
}
