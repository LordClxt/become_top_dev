import { eq, run, test } from './spec.ts';
import { defaultSettings, describePet, distance } from './models.ts';

test('defaultSettings', () => {
  eq(defaultSettings(), { theme: 'light', fontSize: 14 }, 'defaultSettings()');
});

test('describePet : chien et chat', () => {
  eq(describePet({ name: 'Rex', legs: 4, breed: 'Labrador' }), 'Rex (chien Labrador, 4 pattes)', 'chien');
  eq(describePet({ name: 'Tom', legs: 4, indoor: true }), "Tom (chat d'intérieur, 4 pattes)", 'chat d’intérieur');
  eq(describePet({ name: 'Mia', legs: 3, indoor: false }), "Mia (chat d'extérieur, 3 pattes)", 'chat d’extérieur');
});

test('distance', () => {
  eq(distance([0, 0], [3, 4]), 5, 'distance([0,0],[3,4])');
  eq(distance([1, 1], [1, 1]), 0, 'distance nulle');
});

await run();
