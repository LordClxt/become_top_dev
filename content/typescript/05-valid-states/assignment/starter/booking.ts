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

// TODO 1 : toutes les formes d'entrée → la forme canonique.
export function normalize(input: BookingInput): Booking {
  throw new Error('TODO: normalize');
}

// TODO 2
export function nightCount(booking: Booking): number {
  throw new Error('TODO: nightCount');
}

// TODO 3 : tarif de la chambre × nuits, + 10 € par personne au-delà de 2 et par nuit.
export function priceEur(booking: Booking, nightlyRateEur: Readonly<Record<Room, number>>): number {
  throw new Error('TODO: priceEur');
}

// TODO 4 : [première arrivée, dernier départ] ou null.
export function occupancy(bookings: Iterable<Booking>): [Date, Date] | null {
  throw new Error('TODO: occupancy');
}
