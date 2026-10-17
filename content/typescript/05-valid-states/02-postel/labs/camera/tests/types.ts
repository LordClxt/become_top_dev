import type { Equals, Expect } from './expect.ts';
import type { Camera, CameraOptions, centerOf, LngLat, LngLatLike, viewportFor } from './camera.ts';

export type Checks = [
  Expect<Equals<Required<CameraOptions>['center'], LngLatLike>>,
  Expect<Equals<keyof CameraOptions, keyof Camera>>,
  Expect<Equals<Parameters<typeof centerOf>[0], Iterable<LngLatLike>>>,
  Expect<Equals<ReturnType<typeof centerOf>, LngLat | null>>,
  Expect<Equals<ReturnType<typeof viewportFor>, Camera>>,
];

export const ok: CameraOptions = { zoom: 2 };
export const ok2: CameraOptions = { center: [1, 2] };
// @ts-expect-error zoom est un nombre
export const bad: CameraOptions = { zoom: 'x' };
