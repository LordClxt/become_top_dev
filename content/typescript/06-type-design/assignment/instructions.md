## Contexte

Un agenda de salles de réunion. L'ancien code renvoyait `-1` quand aucun créneau n'était libre, utilisait `room: ''` pour « n'importe quelle salle » et prenait six nombres à la suite. Tu le reconçois avec les principes du chapitre. Les heures sont en **minutes depuis minuit** (`startMin`, `endMin`).

Tu édites `rooms.ts`.

## À faire

1. `RoomPreference` : `{ kind: 'any' } | { kind: 'room'; roomId: string }`.
2. `normalizeRequest(input)` → `MeetingRequest` (tout obligatoire) : `durationMin` vaut 30 par défaut, `attendees` vaut 1, `preference` vaut `{ kind: 'any' }`. `durationMin` doit être un multiple de 15 entre 15 et 240, sinon `Error("durée invalide")`.
3. `findSlot({ rooms, meetings, request, dayStartMin, dayEndMin })` → `Slot | null` : le **plus tôt** créneau libre (pas de 15 min, à partir de `dayStartMin`) dans une salle assez grande (`capacity ≥ attendees`) et conforme à la préférence ; à heure égale, la salle la plus petite qui convient. Deux réunions qui se touchent (`endMin === startMin`) ne se chevauchent pas.
4. `describeSlot(slot)` : `"Salle Ada, 09:30–10:00"`.

## Contraintes

Pas de `-1`, pas de chaîne vide comme valeur spéciale, pas de fonction avec plus de deux paramètres du même type.
