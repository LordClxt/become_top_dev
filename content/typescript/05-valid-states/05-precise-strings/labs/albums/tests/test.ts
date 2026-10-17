import { eq, raises, run, test } from './spec.ts';
import { ofType, parseAlbum, pluck, sortBy } from './albums.ts';

const raws = [
  { artist: 'Miles Davis', title: 'Kind of Blue', releaseDate: '1959-08-17', recordingType: 'studio' },
  { artist: 'Keith Jarrett', title: 'The Köln Concert', releaseDate: '1975-11-30', recordingType: ' Live ' },
  { artist: 'John Coltrane', title: 'A Love Supreme', releaseDate: '1965-01-01', recordingType: 'STUDIO' },
];

test('parseAlbum', async () => {
  eq(parseAlbum(raws[1]!), { artist: 'Keith Jarrett', title: 'The Köln Concert', releaseDate: new Date('1975-11-30T00:00:00Z'), recordingType: 'live' }, 'live');
  const e1 = await raises(() => parseAlbum({ ...raws[0]!, releaseDate: 'August 17th, 1959' }), 'date en toutes lettres');
  eq(e1.message, 'date invalide : August 17th, 1959', 'message date');
  await raises(() => parseAlbum({ ...raws[0]!, releaseDate: '1959-13-45' }), 'date impossible');
  const e2 = await raises(() => parseAlbum({ ...raws[0]!, recordingType: 'concert' }), 'type inconnu');
  eq(e2.message, "type d'enregistrement inconnu : concert", 'message type');
});

test('pluck, ofType, sortBy', () => {
  const albums = raws.map(parseAlbum);
  eq(pluck(albums, 'title'), ['Kind of Blue', 'The Köln Concert', 'A Love Supreme'], 'pluck title');
  eq(pluck(albums, 'releaseDate').map((d) => d.getUTCFullYear()), [1959, 1975, 1965], 'pluck releaseDate');
  eq(ofType(albums, 'studio').map((a) => a.title), ['Kind of Blue', 'A Love Supreme'], 'ofType studio');
  eq(sortBy(albums, 'releaseDate').map((a) => a.title), ['Kind of Blue', 'A Love Supreme', 'The Köln Concert'], 'sortBy date');
  eq(sortBy(albums, 'artist').map((a) => a.artist), ['John Coltrane', 'Keith Jarrett', 'Miles Davis'], 'sortBy artist');
  eq(albums[0]!.title, 'Kind of Blue', "sortBy ne modifie pas l'original");
  eq(sortBy([{ n: 3 }, { n: 1 }, { n: 2 }], 'n'), [{ n: 1 }, { n: 2 }, { n: 3 }], 'sortBy nombre');
});

await run();
