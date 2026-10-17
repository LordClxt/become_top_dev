import { eq, run, test } from './spec.ts';
import { EventBus } from './bus.ts';

interface AppEvents {
  selected: { id: number };
  renamed: { id: number; name: string };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
function makeBus() {
  return new EventBus<AppEvents>({
    selected: (p): p is { id: number } => isObj(p) && typeof p.id === 'number',
    renamed: (p): p is { id: number; name: string } => isObj(p) && typeof p.id === 'number' && typeof p.name === 'string',
  });
}

test('on et emit', () => {
  const bus = makeBus();
  const seen: string[] = [];
  bus.on('selected', (p) => seen.push(`a${p.id}`));
  bus.on('selected', (p) => seen.push(`b${p.id}`));
  bus.on('renamed', (p) => seen.push(p.name));
  eq(bus.emit('selected', { id: 7 }), 2, 'deux handlers');
  eq(bus.emit('renamed', { id: 7, name: 'Ada' }), 1, 'un handler');
  eq(seen, ['a7', 'b7', 'Ada'], 'ordre d’inscription');
});

test('désabonnement', () => {
  const bus = makeBus();
  let n = 0;
  const off = bus.on('selected', () => n++);
  bus.emit('selected', { id: 1 });
  off();
  eq(bus.emit('selected', { id: 1 }), 0, 'plus de handler');
  eq(n, 1, 'appelé une fois');
});

test('un handler qui plante n’arrête pas les autres', () => {
  const bus = makeBus();
  let reached = false;
  bus.on('selected', () => { throw new Error('boom'); });
  bus.on('selected', () => { reached = true; });
  eq(bus.emit('selected', { id: 1 }), 2, 'deux handlers appelés');
  eq(reached, true, 'le second est appelé');
  const errs = bus.errors();
  eq(errs, ['selected: boom'], 'erreur journalisée');
  (errs as string[]).push('x');
  eq(bus.errors().length, 1, 'errors renvoie une copie');
});

test('receive : messages externes', () => {
  const bus = makeBus();
  const names: string[] = [];
  bus.on('renamed', (p) => names.push(p.name));
  eq(bus.receive({ event: 'renamed', payload: { id: 1, name: 'Grace' } }), { ok: true, event: 'renamed', delivered: 1 }, 'valide');
  eq(names, ['Grace'], 'livré');
  eq(bus.receive('renamed'), { ok: false, reason: 'message mal formé' }, 'chaîne');
  eq(bus.receive({ event: 'renamed' }), { ok: false, reason: 'message mal formé' }, 'sans payload');
  eq(bus.receive({ event: 'deleted', payload: {} }), { ok: false, reason: 'événement inconnu : deleted' }, 'inconnu');
  eq(bus.receive({ event: 'toString', payload: {} }), { ok: false, reason: 'événement inconnu : toString' }, 'clé héritée');
  eq(bus.receive({ event: 'renamed', payload: { id: 1 } }), { ok: false, reason: 'charge invalide pour renamed' }, 'charge invalide');
  eq(names, ['Grace'], 'rien de livré après les échecs');
});

await run();
