import { eq, run, test } from './spec.ts';
import { Temperature, build, getTheme, settings, themeNames } from './spaces.ts';

test('getTheme renvoie le thème demandé', () => {
  eq(getTheme('dark').background, '#111111', "getTheme('dark').background");
  eq(getTheme('solar').color, '#657b83', "getTheme('solar').color");
});

test('themeNames liste les clés de la constante', () => {
  eq(themeNames(), ['light', 'dark', 'solar'], 'themeNames()');
});

test('settings : valeurs par défaut, surchargeables, sans partage du tableau', () => {
  eq(settings(), { fontSize: 14, wrap: true, tabs: ['js', 'ts'] }, 'settings()');
  eq(settings({ fontSize: 20 }).fontSize, 20, 'settings({ fontSize: 20 })');
  const a = settings();
  a.tabs.push('py');
  eq(settings().tabs, ['js', 'ts'], 'modifier un résultat ne doit pas modifier les valeurs par défaut');
});

test('build construit une Temperature', () => {
  const t = build(Temperature, 100);
  eq(t.fahrenheit, 212, 'build(Temperature, 100).fahrenheit');
  eq(t instanceof Temperature, true, 'instanceof Temperature');
});

await run();
