export interface Room {
  id: string;
  name: string;
  capacity: number;
}

export interface Meeting {
  roomId: string;
  startMin: number;
  endMin: number;
}

export type RoomPreference = { kind: 'any' } | { kind: 'room'; roomId: string };

export interface MeetingRequestInput {
  durationMin?: number;
  attendees?: number;
  preference?: RoomPreference;
}

/** La demande normalisée : les défauts sont appliqués une seule fois. */
export type MeetingRequest = Required<MeetingRequestInput>;

export function normalizeRequest(input: MeetingRequestInput): MeetingRequest {
  const durationMin = input.durationMin ?? 30;
  if (durationMin % 15 !== 0 || durationMin < 15 || durationMin > 240) throw new Error('durée invalide');
  return { durationMin, attendees: input.attendees ?? 1, preference: input.preference ?? { kind: 'any' } };
}

export interface Slot {
  room: Room;
  startMin: number;
  endMin: number;
}

const STEP_MIN = 15;

function isFree(meetings: readonly Meeting[], roomId: string, startMin: number, endMin: number): boolean {
  return meetings.every((m) => m.roomId !== roomId || m.endMin <= startMin || m.startMin >= endMin);
}

export function findSlot(params: {
  rooms: readonly Room[];
  meetings: readonly Meeting[];
  request: MeetingRequest;
  dayStartMin: number;
  dayEndMin: number;
}): Slot | null {
  const { rooms, meetings, request, dayStartMin, dayEndMin } = params;
  const { preference } = request;
  const candidates = rooms
    .filter((r) => r.capacity >= request.attendees)
    .filter((r) => preference.kind === 'any' || r.id === preference.roomId)
    .toSorted((a, b) => a.capacity - b.capacity);
  for (let startMin = dayStartMin; startMin + request.durationMin <= dayEndMin; startMin += STEP_MIN) {
    const endMin = startMin + request.durationMin;
    const room = candidates.find((r) => isFree(meetings, r.id, startMin, endMin));
    if (room) return { room, startMin, endMin };
  }
  return null;
}

const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function describeSlot(slot: Slot): string {
  return `Salle ${slot.room.name}, ${clock(slot.startMin)}–${clock(slot.endMin)}`;
}
