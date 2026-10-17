import { eq, raises, run, test } from './spec.ts';
import { nightCount, normalize, occupancy, priceEur } from './booking.ts';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

test('normalize : formes variées', () => {
  eq(normalize({ checkIn: '2024-07-01', checkOut: d('2024-07-04'), guests: ' 3 ', room: ' Double ', email: 'ada@example.com', phone: '  ' }),
    { checkIn: d('2024-07-01'), checkOut: d('2024-07-04'), guests: 3, room: 'double', contact: { email: 'ada@example.com' } }, 'web');
  eq(normalize({ checkIn: d('2024-07-01'), checkOut: '2024-07-02', guests: 1, room: 'SUITE' }),
    { checkIn: d('2024-07-01'), checkOut: d('2024-07-02'), guests: 1, room: 'suite' }, 'sans contact : pas de clé');
  eq(normalize({ checkIn: '2024-07-01', checkOut: '2024-07-02', guests: 2, room: 'single', phone: '0102' }).contact, { phone: '0102' }, 'téléphone seul');
});

test('normalize : erreurs', async () => {
  const base = { checkIn: '2024-07-01', checkOut: '2024-07-03', guests: 2, room: 'double' };
  eq((await raises(() => normalize({ ...base, checkOut: '2024-07-01' }), 'même jour')).message, 'séjour invalide', 'séjour vide');
  eq((await raises(() => normalize({ ...base, checkIn: '01/07/2024' }), 'format')).message, 'date invalide : 01/07/2024', 'format de date');
  for (const guests of [0, 5, 2.5, 'deux', '']) {
    eq((await raises(() => normalize({ ...base, guests }), `guests ${guests}`)).message, 'nombre de personnes invalide', `guests ${JSON.stringify(guests)}`);
  }
  eq((await raises(() => normalize({ ...base, room: 'dortoir' }), 'chambre')).message, 'chambre inconnue : dortoir', 'chambre');
});

test('nightCount et priceEur', () => {
  const rates = { single: 80, double: 100, suite: 200 };
  const b = normalize({ checkIn: '2024-07-01', checkOut: '2024-07-04', guests: 4, room: 'suite' });
  eq(nightCount(b), 3, 'nuits');
  eq(priceEur(b, rates), (200 + 20) * 3, 'prix avec 2 personnes en plus');
  eq(priceEur(normalize({ checkIn: '2024-07-01', checkOut: '2024-07-02', guests: 2, room: 'single' }), rates), 80, 'prix simple');
});

test('occupancy', () => {
  const a = normalize({ checkIn: '2024-07-05', checkOut: '2024-07-08', guests: 1, room: 'single' });
  const b = normalize({ checkIn: '2024-07-01', checkOut: '2024-07-03', guests: 1, room: 'single' });
  const c = normalize({ checkIn: '2024-07-02', checkOut: '2024-07-10', guests: 1, room: 'single' });
  eq(occupancy([a, b, c]), [d('2024-07-01'), d('2024-07-10')], 'étendue');
  eq(occupancy([]), null, 'aucune réservation');
});

await run();
