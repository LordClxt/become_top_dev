import { eq, run, test } from './spec.ts';
import { describeConfig, formatHike, normalize } from './config.ts';

test('normalize', () => {
  eq(normalize({}), { unitSystem: 'imperial', darkMode: false, decimals: 1 }, 'défauts');
  eq(normalize({ unitSystem: 'metric', darkMode: true, decimals: 0 }), { unitSystem: 'metric', darkMode: true, decimals: 0 }, 'tout fourni (0 conservé)');
  eq(normalize({ unitSystem: undefined, decimals: 2 }), { unitSystem: 'imperial', darkMode: false, decimals: 2 }, 'undefined explicite');
});

test('formatHike', () => {
  const hike = { miles: 3.1, hours: 1.5 };
  eq(formatHike(hike, normalize({})), '3.1 mi à 2.1 mph', 'impérial');
  eq(formatHike(hike, normalize({ unitSystem: 'metric' })), '5.0 km à 3.3 km/h', 'métrique');
  eq(formatHike(hike, normalize({ unitSystem: 'metric', decimals: 2 })), '4.99 km à 3.33 km/h', 'deux décimales');
});

test('describeConfig', () => {
  eq(describeConfig(normalize({})), 'impérial, thème clair, 1 décimale(s)', 'défauts');
  eq(describeConfig(normalize({ unitSystem: 'metric', darkMode: true, decimals: 2 })), 'métrique, thème sombre, 2 décimale(s)', 'personnalisé');
});

await run();
