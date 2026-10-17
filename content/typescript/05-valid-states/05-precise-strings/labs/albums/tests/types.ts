import type { Equals, Expect } from './expect.ts';
import { pluck, sortBy } from './albums.ts';
import type { Album, RecordingType } from './albums.ts';

declare const albums: Album[];
const dates = pluck(albums, 'releaseDate');
const sorted = sortBy(albums, 'title');

export type Checks = [
  Expect<Equals<RecordingType, 'studio' | 'live'>>,
  Expect<Equals<Album['releaseDate'], Date>>,
  Expect<Equals<typeof dates, Date[]>>,
  Expect<Equals<typeof sorted, Album[]>>,
];

// @ts-expect-error la colonne n'existe pas
pluck(albums, 'recordingDate');
// @ts-expect-error 'Studio' n'est pas un RecordingType
export const t: RecordingType = 'Studio';
