import { eq, raises, run, test } from './spec.ts';
import { applyOptions, centerOf, toLngLat, viewportFor } from './camera.ts';
import type { Camera } from './camera.ts';

const base: Camera = { center: { lng: 0, lat: 0 }, zoom: 3, bearing: 10, pitch: 20 };

test('toLngLat', () => {
  eq(toLngLat({ lng: 2.35, lat: 48.85 }), { lng: 2.35, lat: 48.85 }, '{ lng, lat }');
  eq(toLngLat({ lon: 2.35, lat: 48.85 }), { lng: 2.35, lat: 48.85 }, '{ lon, lat }');
  eq(toLngLat([2.35, 48.85]), { lng: 2.35, lat: 48.85 }, '[lng, lat]');
});

test('applyOptions', () => {
  eq(applyOptions(base, { zoom: 8 }), { ...base, zoom: 8 }, 'zoom seul');
  eq(applyOptions(base, { center: [1, 2], pitch: 0 }), { center: { lng: 1, lat: 2 }, zoom: 3, bearing: 10, pitch: 0 }, 'center normalisé, pitch 0 conservé');
  eq(applyOptions(base, { zoom: undefined }), base, 'une option undefined ne change rien');
  eq(applyOptions(base, {}), base, 'aucune option');
});

test('centerOf accepte tout itérable', () => {
  eq(centerOf([[0, 0], { lng: 4, lat: 2 }]), { lng: 2, lat: 1 }, 'tableau');
  eq(centerOf(new Set([{ lon: 1, lat: 1 } as const])), { lng: 1, lat: 1 }, 'Set');
  function* gen() { yield [2, 4] as const; yield [4, 8] as const; }
  eq(centerOf(gen()), { lng: 3, lat: 6 }, 'générateur');
  eq(centerOf([]), null, 'vide');
});

test('viewportFor', async () => {
  const cam = viewportFor([[0, 0], [10, 4]], (span) => 20 - span);
  eq(cam, { center: { lng: 5, lat: 2 }, zoom: 10, bearing: 0, pitch: 0 }, 'viewport');
  await raises(() => viewportFor([], () => 1), 'aucun point');
});

await run();
