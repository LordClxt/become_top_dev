import { check, eq, raises, run, test } from './spec.ts';
import {
  adapt, checkPluginIsolation, ContractViolationError, contractProblems, Core, DuplicatePluginError, NoPluginError,
  pluginNamespace, PluginTimeoutError, remotePlugin, type AssessmentOutput, type AssessmentPlugin, type DeviceData, type Timer,
} from './plugins.ts';

const device = (model: string, batteryHealthPct = 90, screenCracked = false): DeviceData => ({ serial: `SN-${model}`, model, batteryHealthPct, screenCracked });
const iphone: AssessmentPlugin = {
  name: 'iphone6s',
  assess: (d) => {
    const value = d.screenCracked ? 60 : 120;
    return d.batteryHealthPct < 70
      ? { assessmentReport: 'Batterie usée : recyclage', resell: false, value: 15, resellPrice: 0 }
      : { assessmentReport: `Revendable (${d.batteryHealthPct} %)`, resell: true, value, resellPrice: value * 1.5 };
  },
};

/** Minuterie simulée : advance(ms) résout les attentes échues. */
class FakeTimer implements Timer {
  private now = 0;
  private waiting: { at: number; resolve: () => void }[] = [];
  after(ms: number) { return new Promise<void>((resolve) => this.waiting.push({ at: this.now + ms, resolve })); }
  async advance(ms: number) {
    this.now += ms;
    const due = this.waiting.filter((w) => w.at <= this.now);
    this.waiting = this.waiting.filter((w) => w.at > this.now);
    for (const w of due) w.resolve();
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }
}

// ---------- Jalon 1 ----------

test('M1 enregistrer, lister, retirer', async () => {
  const core = new Core();
  core.register('iPhone6s', iphone);
  core.register('Galaxy5', { name: 'galaxy5', assess: () => ({ assessmentReport: 'ok', resell: true, value: 1, resellPrice: 2 }) });
  eq(core.keys(), ['Galaxy5', 'iPhone6s'], 'clés triées');
  await raises(() => core.register('iPhone6s', iphone), 'enregistrer deux fois la même clé', DuplicatePluginError);
  eq([core.deregister('Galaxy5'), core.deregister('Galaxy5')], [true, false], 'deregister');
  eq(core.keys(), ['iPhone6s'], 'clés après retrait');
});

test('M1 le cœur localise et appelle le plug-in', async () => {
  const core = new Core();
  core.register('iPhone6s', iphone);
  eq(await core.assess('iPhone6s', device('iPhone6s')), { assessmentReport: 'Revendable (90 %)', resell: true, value: 120, resellPrice: 180 }, 'évaluation');
  eq((await core.assess('iPhone6s', device('iPhone6s', 50))).resell, false, 'batterie usée');
  await raises(() => core.assess('Nokia3310', device('Nokia3310')), 'appareil sans plug-in', NoPluginError);
});

test('M1 le contrat est vérifié', async () => {
  eq(contractProblems({ assessmentReport: 'ok', resell: true, value: 10, resellPrice: 15 }), [], 'réponse conforme');
  eq(contractProblems({ assessmentReport: ' ', resell: 'yes', value: -1, resellPrice: Number.NaN }).length, 4, 'quatre problèmes');
  eq(contractProblems({ assessmentReport: 'à recycler', resell: false, value: 5, resellPrice: 10 }),
    ['resellPrice doit valoir 0 si l’appareil n’est pas revendu'], 'prix de revente alors que non revendu');
  const core = new Core();
  core.register('bad', { name: 'bad', assess: () => ({ assessmentReport: '', resell: true, value: 1, resellPrice: 1 }) as AssessmentOutput });
  const e = await raises(() => core.assess('bad', device('x')), 'plug-in qui viole le contrat', ContractViolationError);
  eq(e.problems, ['assessmentReport doit être un texte non vide'], 'problèmes signalés');
});

// ---------- Jalon 2 ----------

test('M2 adaptateur pour un plug-in tiers', async () => {
  // Le plug-in de Samsung renvoie une note et un prix en centimes.
  const samsung = (d: DeviceData) => ({ grade: d.screenCracked ? 'D' : 'A', priceCents: d.screenCracked ? 1500 : 9900 });
  const plugin = adapt('samsung-s9', samsung, (raw, d) => raw.grade === 'D'
    ? { assessmentReport: `Note ${raw.grade} : recyclage`, resell: false, value: raw.priceCents / 100, resellPrice: 0 }
    : { assessmentReport: `Note ${raw.grade} (${d.model})`, resell: true, value: raw.priceCents / 100, resellPrice: (raw.priceCents / 100) * 1.4 });
  const core = new Core();
  core.register('GalaxyS9', plugin);
  eq(await core.assess('GalaxyS9', device('GalaxyS9')), { assessmentReport: 'Note A (GalaxyS9)', resell: true, value: 99, resellPrice: 138.6 }, 'note A');
  eq((await core.assess('GalaxyS9', device('GalaxyS9', 90, true))).assessmentReport, 'Note D : recyclage', 'note D');
  eq(plugin.name, 'samsung-s9', 'nom du plug-in adapté');
});

test('M2 convention de nommage', () => {
  eq(pluginNamespace('app/plugin/assessment/iphone6s/index.ts'), { domain: 'assessment', context: 'iphone6s' }, 'plug-in');
  eq(pluginNamespace('app/plugin/assessment/iphone6s'), { domain: 'assessment', context: 'iphone6s' }, 'dossier du plug-in');
  eq(pluginNamespace('app/core/registry.ts'), undefined, 'le cœur');
  eq(pluginNamespace('app/plugin/assessment'), undefined, 'il manque le contexte');
});

test('M2 indépendance des plug-ins', () => {
  const graph = {
    'app/core/assess.ts': ['app/core/db/devices.ts', 'app/plugin/assessment/iphone6s/index.ts'],
    'app/plugin/assessment/iphone6s/index.ts': ['app/plugin/assessment/iphone6s/pricing.ts', 'app/core/db/devices.ts'],
    'app/plugin/assessment/galaxy-s9/index.ts': ['app/plugin/assessment/iphone6s/pricing.ts', 'app/shared/money.ts'],
    'app/plugin/assessment/galaxy-s9/rules.ts': ['app/plugin/assessment/galaxy-s9/index.ts'],
  };
  eq(checkPluginIsolation(graph, 'app/core/db/'), [
    { from: 'app/plugin/assessment/galaxy-s9/index.ts', to: 'app/plugin/assessment/iphone6s/pricing.ts', kind: 'plugin-to-plugin' },
    { from: 'app/plugin/assessment/iphone6s/index.ts', to: 'app/core/db/devices.ts', kind: 'plugin-to-central-db' },
  ], 'violations (les imports internes à un plug-in et ceux du cœur sont permis)');
});

// ---------- Jalon 3 ----------

test('M3 plug-in distant : réponse dans les temps', async () => {
  const timer = new FakeTimer();
  const remote = remotePlugin('pixel3', async () => ({ assessmentReport: 'ok', resell: true, value: 50, resellPrice: 70 }), { timeoutMs: 1000, timer });
  const core = new Core();
  core.register('Pixel3', remote);
  eq((await core.assess('Pixel3', device('Pixel3'))).value, 50, 'valeur');
});

test('M3 plug-in distant : timeout', async () => {
  const timer = new FakeTimer();
  const remote = remotePlugin('pixel3', () => new Promise<AssessmentOutput>(() => {}), { timeoutMs: 1000, timer });
  const core = new Core();
  core.register('Pixel3', remote);
  let settled: unknown = 'en attente';
  const p = core.assess('Pixel3', device('Pixel3')).then(() => 'résolu', (e: unknown) => e);
  void p.then((v) => { settled = v; });
  await timer.advance(999);
  eq(settled, 'en attente', 'à 999 ms, toujours en attente');
  await timer.advance(1);
  await p;
  check(settled instanceof PluginTimeoutError, `à 1 000 ms, l’appel doit échouer avec PluginTimeoutError, obtenu ${String(settled)}`);
});

test('M3 une panne de plug-in n’emporte pas les autres', async () => {
  const timer = new FakeTimer();
  const core = new Core();
  core.register('iPhone6s', iphone);
  core.register('Broken', { name: 'broken', assess: () => { throw new Error('plantage'); } });
  core.register('Slow', remotePlugin('slow', () => new Promise<AssessmentOutput>(() => {}), { timeoutMs: 500, timer }));
  const batch = core.assessAll([
    { key: 'iPhone6s', device: device('iPhone6s') },
    { key: 'Broken', device: device('Broken') },
    { key: 'Unknown', device: device('Unknown') },
    { key: 'Slow', device: device('Slow') },
  ]);
  await timer.advance(500);
  const results = await batch;
  eq(results.map((r) => (r.ok ? `${r.key}:ok` : `${r.key}:${r.error}`)),
    ['iPhone6s:ok', 'Broken:Error', 'Unknown:NoPluginError', 'Slow:PluginTimeoutError'], 'résultats dans l’ordre');
});

await run();
