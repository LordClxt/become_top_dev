import { eq, raises, run, test } from './spec.ts';
import { describeLayer, eulogize, fromApi } from './layers.ts';

test('describeLayer', () => {
  eq(describeLayer({ type: 'fill', layout: { fillSortKey: 1 }, paint: { fillColor: '#ff0000', fillOpacity: 0.5 } }), 'remplissage #ff0000 (opacité 0.5)', 'fill');
  eq(describeLayer({ type: 'line', layout: { lineCap: 'round' }, paint: { lineColor: '#00f', lineWidth: 2 } }), 'ligne #00f de 2px, bouts round', 'line');
  eq(describeLayer({ type: 'point', layout: { iconSize: 1 }, paint: { circleColor: '#0f0', circleRadius: 4 } }), 'points de rayon 4 #0f0', 'point');
});

test('eulogize', () => {
  eq(eulogize({ name: 'Alan', birth: { place: 'London', date: new Date('1912-06-23T00:00:00Z') } }), 'Alan est né le 1912-06-23 à London.', 'avec naissance');
  eq(eulogize({ name: 'Alan' }), 'Alan.', 'sans naissance');
});

test('fromApi', async () => {
  eq(fromApi({ name: 'Grace', placeOfBirth: 'New York', dateOfBirth: '1906-12-09T00:00:00Z' }),
    { name: 'Grace', birth: { place: 'New York', date: new Date('1906-12-09T00:00:00Z') } }, 'complet');
  eq(fromApi({ name: 'Grace' }), { name: 'Grace' }, 'sans naissance');
  const e = await raises(() => fromApi({ name: 'Grace', placeOfBirth: 'New York' }), 'lieu seul');
  eq(e.message, 'naissance incomplète', 'message');
  await raises(() => fromApi({ name: 'Grace', dateOfBirth: '1906-12-09' }), 'date seule');
});

await run();
