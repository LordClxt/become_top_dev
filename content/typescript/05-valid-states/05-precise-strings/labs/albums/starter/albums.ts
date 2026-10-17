// TODO 1 : des types précis (Date, union de littéraux).
export type RecordingType = string;

export interface Album {
  artist: string;
  title: string;
  releaseDate: string; // AAAA-MM-JJ
  recordingType: RecordingType; // "studio" ou "live"
}

/** Forme brute, tout en chaînes. */
export interface RawAlbum {
  artist: string;
  title: string;
  releaseDate: string;
  recordingType: string;
}

// TODO 2 : convertit, en refusant les dates et types invalides.
export function parseAlbum(raw: RawAlbum): Album {
  throw new Error('TODO: parseAlbum');
}

// TODO 3 : pluck<T, K extends keyof T>
export function pluck(records: readonly unknown[], key: string): unknown[] {
  throw new Error('TODO: pluck');
}

// TODO 4 : les albums d'un type.
export function ofType(albums: readonly Album[], type: RecordingType): Album[] {
  throw new Error('TODO: ofType');
}

// TODO 5 : une copie triée par la colonne key (string, number ou Date).
export function sortBy(records: readonly unknown[], key: string): unknown[] {
  throw new Error('TODO: sortBy');
}
