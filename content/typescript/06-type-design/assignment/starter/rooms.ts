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

// TODO 1 : n'importe quelle salle, ou une salle précise (union taguée).
export type RoomPreference = string;

export interface MeetingRequestInput {
  durationMin?: number;
  attendees?: number;
  preference?: RoomPreference;
}

// TODO 2 : la demande normalisée (tout obligatoire), dérivée de MeetingRequestInput.
export type MeetingRequest = MeetingRequestInput;

export function normalizeRequest(input: MeetingRequestInput): MeetingRequest {
  throw new Error('TODO: normalizeRequest');
}

export interface Slot {
  room: Room;
  startMin: number;
  endMin: number;
}

// TODO 3 : un objet de paramètres ; le plus tôt créneau libre, ou null.
export function findSlot(params: {
  rooms: readonly Room[];
  meetings: readonly Meeting[];
  request: MeetingRequest;
  dayStartMin: number;
  dayEndMin: number;
}): Slot | null {
  throw new Error('TODO: findSlot');
}

// TODO 4 : "Salle Ada, 09:30–10:00".
export function describeSlot(slot: Slot): string {
  throw new Error('TODO: describeSlot');
}
