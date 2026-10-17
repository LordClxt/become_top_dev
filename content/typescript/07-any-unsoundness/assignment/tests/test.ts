import { eq, raises, run, test } from './spec.ts';
import { applyEnv, isRecord, loadConfig, readConfig } from './config.ts';

test('isRecord', () => {
  eq([{}, { a: 1 }, null, [], 'x', 1].map(isRecord), [true, true, false, false, false, false], 'isRecord');
});

test('readConfig : valeurs et défauts', () => {
  eq(readConfig({ port: 8080 }), { port: 8080, host: 'localhost', debug: false, features: [] }, 'défauts');
  eq(readConfig({ port: 80, host: 'example.com', debug: true, features: ['a'] }), { port: 80, host: 'example.com', debug: true, features: ['a'] }, 'complet');
});

test('readConfig : erreurs collectées', async () => {
  eq((await raises(() => readConfig([]), 'tableau')).message, 'configuration : un objet est attendu', 'pas un objet');
  eq((await raises(() => readConfig({ port: '80', features: [1] }), 'deux erreurs')).message, 'configuration : port invalide ; features invalide', 'deux erreurs');
  eq((await raises(() => readConfig({ port: 70000, host: '', debug: 'oui' }), 'trois erreurs')).message, 'configuration : port invalide ; host invalide ; debug invalide', 'trois erreurs');
});

test('applyEnv', () => {
  const base = { port: 80, host: 'h', debug: false, features: ['a'] };
  eq(applyEnv(base, { APP_PORT: '9000', APP_DEBUG: 'true', APP_FEATURES: ' x, ,y ' }), { port: 9000, host: 'h', debug: true, features: ['x', 'y'] }, 'surcharges');
  eq(applyEnv(base, { APP_PORT: 'abc', APP_DEBUG: 'peut-être' }), base, 'valeurs invalides ignorées');
  eq(applyEnv(base, {}), base, 'aucune variable');
  eq(base.port, 80, "l'original ne change pas");
});

test('loadConfig', async () => {
  eq(loadConfig('{"port": 3000}', { APP_HOST: 'api.local' }), { port: 3000, host: 'api.local', debug: false, features: [] }, 'chargement');
  eq((await raises(() => loadConfig('{port: 3000}', {}), 'JSON invalide')).message, 'configuration : JSON invalide', 'JSON invalide');
});

await run();
