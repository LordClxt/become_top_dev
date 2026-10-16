import { eq, run, test } from './spec.ts';
import { flip, getUserInfo, topNav, update } from './derived.ts';

test('topNav ne garde que les trois champs', () => {
  eq(topNav({ userId: 'u1', pageTitle: 'Accueil', recentFiles: ['a.txt'], pageContents: 'long…' }),
    { userId: 'u1', pageTitle: 'Accueil', recentFiles: ['a.txt'] }, 'topNav(state)');
});

test('update : fusionne sans modifier l’original', () => {
  const base = { width: 640, height: 480, color: '#00FF00', label: 'VGA' };
  eq(update(base, { width: 800 }), { width: 800, height: 480, color: '#00FF00', label: 'VGA' }, 'update(base, { width: 800 })');
  eq(base.width, 640, 'base ne doit pas changer');
  eq(update(base, {}), base, 'update(base, {})');
});

test('getUserInfo', () => {
  eq(getUserInfo('u1'), { userId: 'u1', name: 'Ada', age: 36 }, "getUserInfo('u1')");
});

test('flip inverse clés et valeurs', () => {
  eq(flip({ a: 'x', b: 'y' }), { x: 'a', y: 'b' }, 'flip({a: x, b: y})');
  eq(flip({}), {}, 'flip({})');
});

await run();
