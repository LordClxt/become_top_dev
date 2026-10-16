import { eq, raises, run, test } from './spec.ts';
import { DEFAULTS, describe, envName, loadConfig } from './config.ts';

test('envName', () => {
  eq(envName('host'), 'APP_HOST', "envName('host')");
  eq(envName('debug'), 'APP_DEBUG', "envName('debug')");
});

test('loadConfig : valeurs par défaut', () => {
  eq(loadConfig(), { host: 'localhost', port: 8080, debug: false, tags: [] }, 'loadConfig()');
});

test('loadConfig : l’environnement remplace les défauts', () => {
  eq(loadConfig({}, { APP_HOST: 'h', APP_PORT: '3000', APP_DEBUG: 'TRUE' }), { host: 'h', port: 3000, debug: true, tags: [] }, 'env');
  eq(loadConfig({}, { APP_DEBUG: '0' }).debug, false, 'APP_DEBUG=0');
  eq(loadConfig({}, { APP_DEBUG: '1' }).debug, true, 'APP_DEBUG=1');
});

test('loadConfig : les surcharges l’emportent sur l’environnement', () => {
  eq(loadConfig({ port: 1, debug: false }, { APP_PORT: '3000', APP_DEBUG: 'true' }), { host: 'localhost', port: 1, debug: false, tags: [] }, 'surcharges');
});

test('loadConfig : port invalide', async () => {
  for (const port of ['abc', '0', '70000', '80.5', '']) {
    await raises(() => loadConfig({}, { APP_PORT: port }), `APP_PORT=${JSON.stringify(port)}`, RangeError);
  }
});

test('loadConfig : le tableau tags est une copie', () => {
  const config = loadConfig();
  config.tags.push('x');
  eq(DEFAULTS.tags, [], 'les valeurs par défaut ne doivent jamais être modifiées');
  const given = ['a'];
  const config2 = loadConfig({ tags: given });
  config2.tags.push('b');
  eq(given, ['a'], 'le tableau passé en surcharge ne doit pas être modifié');
});

test('describe', () => {
  eq(describe({ host: 'h', port: 1, debug: false, tags: [] }), 'h:1', 'sans options');
  eq(describe({ host: 'h', port: 1, debug: true, tags: ['a', 'b'] }), 'h:1 (debug) [a,b]', 'avec options');
});

await run();
