import { eq, run, test } from './spec.ts';
import { clickMessage, distance, goHome, greeting, history, layerCount, panTo } from './map.ts';

test('valeurs extraites', () => {
  eq(greeting, 'langue : TypeScript', 'greeting');
  eq(layerCount, 1, 'layerCount');
  eq(clickMessage, 'clic en 3,4', 'clickMessage');
});

test('panTo et history', () => {
  goHome();
  panTo([10, 20]);
  const h = history();
  eq(h, [[2.35, 48.85], [10, 20]], 'history()');
  (h as [number, number][]).push([0, 0]);
  eq(history().length, 2, 'history() renvoie une copie');
});

test('distance', () => {
  eq(distance([0, 0], [3, 4]), 5, 'distance([0,0],[3,4])');
  eq(distance([1, 1], [2, 2]), 1.41, 'distance([1,1],[2,2])');
});

await run();
