import type { Equals, Expect } from './expect.ts';
import type { findSlot, MeetingRequest, RoomPreference, Slot } from './rooms.ts';

export type Checks = [
  Expect<Equals<RoomPreference, { kind: 'any' } | { kind: 'room'; roomId: string }>>,
  Expect<Equals<MeetingRequest, { durationMin: number; attendees: number; preference: RoomPreference }>>,
  Expect<Equals<ReturnType<typeof findSlot>, Slot | null>>,
];
