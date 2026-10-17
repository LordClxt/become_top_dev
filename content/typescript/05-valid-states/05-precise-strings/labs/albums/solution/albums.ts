/** Enregistré en studio ou devant un public. */
export type RecordingType = 'studio' | 'live';

export interface Album {
  artist: string;
  title: string;
  releaseDate: Date;
  recordingType: RecordingType;
}

/** Forme brute, tout en chaînes. */
export interface RawAlbum {
  artist: string;
  title: string;
  releaseDate: string;
  recordingType: string;
}

function isRecordingType(s: string): s is RecordingType {
  return s === 'studio' || s === 'live';
}

export function parseAlbum(raw: RawAlbum): Album {
  const { artist, title } = raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.releaseDate)) throw new Error(`date invalide : ${raw.releaseDate}`);
  const releaseDate = new Date(`${raw.releaseDate}T00:00:00Z`);
  if (Number.isNaN(releaseDate.getTime())) throw new Error(`date invalide : ${raw.releaseDate}`);
  const recordingType = raw.recordingType.trim().toLowerCase();
  if (!isRecordingType(recordingType)) throw new Error(`type d'enregistrement inconnu : ${raw.recordingType}`);
  return { artist, title, releaseDate, recordingType };
}

export function pluck<T, K extends keyof T>(records: readonly T[], key: K): T[K][] {
  return records.map((r) => r[key]);
}

export function ofType(albums: readonly Album[], type: RecordingType): Album[] {
  return albums.filter((a) => a.recordingType === type);
}

export function sortBy<T, K extends keyof T>(records: readonly T[], key: K): T[] {
  return records.toSorted((a, b) => {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y);
    return Number(x) - Number(y);
  });
}
