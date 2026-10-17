import { eq, raises, run, test } from './spec.ts';
import { addLine, cancel, deliver, describe, draft, pay, place, refundTotal, ship } from './orders.ts';

const at = new Date('2024-07-01T10:00:00Z');
const UPS = '1Z999AA10123456784';

function paidOrder() {
  let o = draft(7);
  o = addLine(o, { sku: 'A', qty: 2, unitCents: 1990 });
  o = addLine(o, { sku: 'B', qty: 1, unitCents: 2000 });
  return pay(place(o, at), 'card');
}

test('addLine', () => {
  const o = addLine(addLine(draft(1), { sku: 'A', qty: 1, unitCents: 100 }), { sku: 'A', qty: 2, unitCents: 100 });
  eq(o.lines, [{ sku: 'A', qty: 3, unitCents: 100 }], 'quantité cumulée');
  const d = draft(2);
  addLine(d, { sku: 'X', qty: 1, unitCents: 1 });
  eq(d.lines.length, 0, "l'original ne change pas");
});

test('cycle complet', () => {
  const paid = paidOrder();
  eq(paid.status, 'paid', 'payée');
  eq(paid.payment, { method: 'card', amountCents: 5980 }, 'paiement');
  eq(describe(paid), '#7 payée 59,80 €', 'describe payée');
  const shipped = ship(paid, 'ups', UPS);
  eq(describe(shipped), `#7 expédiée par ups (${UPS})`, 'describe expédiée');
  const delivered = deliver(shipped, new Date('2024-07-04T15:00:00Z'));
  eq(delivered.payment.amountCents, 5980, 'la livraison garde le paiement');
  eq(delivered.shipment.carrier, 'ups', 'et l’expédition');
  eq(describe(delivered), '#7 livrée le 2024-07-04', 'describe livrée');
});

test('erreurs de transition', async () => {
  eq((await raises(() => place(draft(1), at), 'vide')).message, 'commande vide', 'commande vide');
  const paid = paidOrder();
  eq((await raises(() => ship(paid, 'colissimo', UPS), 'mauvais format')).message, 'numéro de suivi invalide', 'format colissimo');
  eq(ship(paid, 'colissimo', 'AB123456789FR').shipment.tracking, 'AB123456789FR', 'colissimo valide');
  await raises(() => ship(paid, 'ups', '1Z999'), 'ups trop court');
});

test('describe brouillon et commandée', () => {
  const o = addLine(addLine(draft(7), { sku: 'A', qty: 1, unitCents: 1 }), { sku: 'B', qty: 1, unitCents: 1 });
  eq(describe(o), '#7 brouillon (2 lignes)', 'brouillon');
  eq(describe(place(o, at)), '#7 commandée', 'commandée');
});

test('cancel et refundTotal', () => {
  const c1 = cancel(paidOrder(), 'client absent');
  eq(c1, { status: 'cancelled', id: 7, lines: paidOrder().lines, reason: 'client absent', refundCents: 5980 }, 'annulée après paiement (sans payment)');
  eq(describe(c1), '#7 annulée : client absent (remboursement 59,80 €)', 'describe annulée');
  const c2 = cancel(draft(8), 'erreur');
  eq(c2.refundCents, 0, 'brouillon : rien à rembourser');
  eq(refundTotal([c1, c2, paidOrder(), cancel(paidOrder(), 'x')]), 11960, 'total remboursé');
});

await run();
