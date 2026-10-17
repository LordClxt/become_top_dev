import { eq, run, test } from './spec.ts';
import { describe, EVENT_KINDS, isPurchase, parseEvent, report } from './analytics.ts';

test('EVENT_KINDS', () => {
  eq(EVENT_KINDS, ['page_view', 'click', 'purchase'], 'EVENT_KINDS');
});

test('parseEvent : événements valides, champs inconnus retirés', () => {
  eq(parseEvent({ kind: 'page_view', userId: 'ada', at: 1, path: '/home', extra: 'x' }),
    { kind: 'page_view', userId: 'ada', at: 1, path: '/home' }, 'page_view');
  eq(parseEvent({ kind: 'click', userId: 'ada', at: 2, target: 'buy' }), { kind: 'click', userId: 'ada', at: 2, target: 'buy' }, 'click');
  eq(parseEvent({ kind: 'purchase', userId: 'bob', at: 3, amount: 9.99, currency: 'EUR', path: '/x' }),
    { kind: 'purchase', userId: 'bob', at: 3, amount: 9.99, currency: 'EUR' }, 'purchase');
});

test('parseEvent : invalides', () => {
  const bad: unknown[] = [
    null, 42, 'page_view', [], {},
    { kind: 'scroll', userId: 'ada', at: 1 },
    { kind: 'click', userId: '', at: 1, target: 'x' },
    { kind: 'click', userId: 'ada', at: Infinity, target: 'x' },
    { kind: 'click', userId: 'ada', at: '1', target: 'x' },
    { kind: 'page_view', userId: 'ada', at: 1, path: 'home' },
    { kind: 'click', userId: 'ada', at: 1, target: '' },
    { kind: 'purchase', userId: 'ada', at: 1, amount: 0, currency: 'EUR' },
    { kind: 'purchase', userId: 'ada', at: 1, amount: 5, currency: 'GBP' },
    { kind: 'purchase', userId: 'ada', at: 1, amount: '5', currency: 'EUR' },
  ];
  for (const raw of bad) eq(parseEvent(raw), null, `parseEvent(${JSON.stringify(raw)})`);
});

test('isPurchase et describe', () => {
  const p = parseEvent({ kind: 'purchase', userId: 'ada', at: 1, amount: 9.99, currency: 'EUR' })!;
  const v = parseEvent({ kind: 'page_view', userId: 'ada', at: 1, path: '/home' })!;
  const c = parseEvent({ kind: 'click', userId: 'ada', at: 1, target: 'buy' })!;
  eq(isPurchase(p), true, 'isPurchase(achat)');
  eq(isPurchase(v), false, 'isPurchase(vue)');
  eq(describe(v), 'ada a vu /home', 'describe(vue)');
  eq(describe(c), 'ada a cliqué sur buy', 'describe(clic)');
  eq(describe(p), 'ada a payé 9.99 EUR', 'describe(achat)');
});

test('report complet', () => {
  const raws = [
    { kind: 'page_view', userId: 'ada', at: 5, path: '/cart' },
    { kind: 'page_view', userId: 'bob', at: 9, path: '/pay' },
    { kind: 'page_view', userId: 'ada', at: 1, path: '/home' },
    { kind: 'click', userId: 'ada', at: 6, target: 'buy' },
    { kind: 'purchase', userId: 'ada', at: 7, amount: 0.1, currency: 'EUR' },
    { kind: 'purchase', userId: 'ada', at: 8, amount: 0.2, currency: 'EUR' },
    { kind: 'purchase', userId: 'cy', at: 8, amount: 5, currency: 'USD' },
    { kind: 'nope' },
    null,
  ];
  eq(report(raws), {
    total: 9, invalid: 2, byKind: { page_view: 3, click: 1, purchase: 3 }, users: 3,
    revenue: { EUR: 0.3, USD: 5 }, lastPath: '/pay',
  }, 'report');
});

test('report sans achat ni vue', () => {
  const r = report([{ kind: 'click', userId: 'ada', at: 1, target: 'x' }, 'junk']);
  eq(r, { total: 2, invalid: 1, byKind: { page_view: 0, click: 1, purchase: 0 }, users: 1 }, 'report minimal');
  eq('revenue' in r || 'lastPath' in r, false, 'pas de clés revenue / lastPath');
  eq(report([]), { total: 0, invalid: 0, byKind: { page_view: 0, click: 0, purchase: 0 }, users: 0 }, 'report([])');
});

await run();
