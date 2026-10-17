import { eq, raises, run, test } from './spec.ts';
import { describeSlot, findSlot, normalizeRequest } from './rooms.ts';

const rooms = [
  { id: 'big', name: 'Turing', capacity: 12 },
  { id: 'small', name: 'Ada', capacity: 4 },
];
const day = { dayStartMin: 9 * 60, dayEndMin: 12 * 60 };

test('normalizeRequest', async () => {
  eq(normalizeRequest({}), { durationMin: 30, attendees: 1, preference: { kind: 'any' } }, 'défauts');
  eq(normalizeRequest({ durationMin: 60, attendees: 6, preference: { kind: 'room', roomId: 'big' } }),
    { durationMin: 60, attendees: 6, preference: { kind: 'room', roomId: 'big' } }, 'complet');
  for (const durationMin of [0, 10, 245, 300]) {
    eq((await raises(() => normalizeRequest({ durationMin }), `durée ${durationMin}`)).message, 'durée invalide', `durée ${durationMin}`);
  }
});

test('findSlot : la plus petite salle libre au plus tôt', () => {
  const slot = findSlot({ rooms, meetings: [], request: normalizeRequest({ attendees: 3 }), ...day });
  eq(slot && describeSlot(slot), 'Salle Ada, 09:00–09:30', 'Ada à 9 h');
});

test('findSlot : réunions existantes', () => {
  const meetings = [
    { roomId: 'small', startMin: 540, endMin: 600 },
    { roomId: 'big', startMin: 540, endMin: 570 },
  ];
  const slot = findSlot({ rooms, meetings, request: normalizeRequest({ attendees: 2 }), ...day });
  eq(slot && describeSlot(slot), 'Salle Turing, 09:30–10:00', 'Turing libre à 9 h 30 (les réunions qui se touchent ne se chevauchent pas)');
  const forced = findSlot({ rooms, meetings, request: normalizeRequest({ preference: { kind: 'room', roomId: 'small' } }), ...day });
  eq(forced && describeSlot(forced), 'Salle Ada, 10:00–10:30', 'préférence Ada');
});

test('findSlot : aucun créneau', () => {
  eq(findSlot({ rooms, meetings: [], request: normalizeRequest({ attendees: 20 }), ...day }), null, 'trop de participants');
  const full = [{ roomId: 'big', startMin: 540, endMin: 720 }, { roomId: 'small', startMin: 540, endMin: 720 }];
  eq(findSlot({ rooms, meetings: full, request: normalizeRequest({}), ...day }), null, 'journée pleine');
  eq(findSlot({ rooms, meetings: [], request: normalizeRequest({ durationMin: 240 }), ...day }), null, 'trop long pour la journée');
});

await run();
