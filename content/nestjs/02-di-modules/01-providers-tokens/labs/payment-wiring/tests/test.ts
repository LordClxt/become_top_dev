import 'reflect-metadata';
import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { check, eq, run, test } from './spec.js';
import { LEGACY_GATEWAY, PaymentsModule } from './payments.module.js';
import { AUDIT_SINK, CheckoutService, PAYMENTS_CONFIG, PaymentGateway, type AuditSink } from './payments.js';

/** Un consommateur dans un AUTRE module : il ne voit que ce que PaymentsModule exporte. */
@Injectable()
class Shop {
  constructor(
    readonly checkout: CheckoutService,
    readonly gateway: PaymentGateway,
    @Inject(LEGACY_GATEWAY) readonly legacy: PaymentGateway,
  ) {}
}
@Module({ imports: [PaymentsModule], providers: [Shop] })
class ShopModule {}

async function compile(config?: { mode: 'test' | 'live'; currency: string }, audit?: AuditSink) {
  let builder = Test.createTestingModule({ imports: [ShopModule] });
  if (config) builder = builder.overrideProvider(PAYMENTS_CONFIG).useValue(config);
  if (audit) {
    @Module({ providers: [{ provide: AUDIT_SINK, useValue: audit }], exports: [AUDIT_SINK] })
    class AuditModule {}
    builder = Test.createTestingModule({ imports: [ShopModule, AuditModule] });
  }
  const ref = await builder.compile();
  return ref.get(Shop);
}

test('le module démarre et CheckoutService est injectable depuis un autre module', async () => {
  const shop = await compile();
  eq(shop.checkout.pay(1000), { receipt: 'fake_1000_EUR', gateway: 'fake' }, 'paiement en mode test');
});

test('la passerelle dépend de la configuration injectée (useFactory + inject)', async () => {
  const shop = await compile({ mode: 'live', currency: 'USD' });
  eq(shop.gateway.name, 'live', 'passerelle en mode live');
  eq(shop.checkout.pay(1000), { receipt: 'live_1100_USD', gateway: 'live' }, 'paiement converti en USD');
});

test('les taux sont résolus avant l\'instanciation (provider asynchrone)', async () => {
  const shop = await compile({ mode: 'test', currency: 'USD' });
  eq(shop.checkout.pay(200).receipt, 'fake_220_USD', 'reçu en USD (les taux doivent être un objet, pas une Promise)');
});

test('LEGACY_GATEWAY est un alias : la même instance (useExisting)', async () => {
  PaymentGateway.instances = 0;
  const shop = await compile();
  check(shop.legacy === shop.gateway, 'LEGACY_GATEWAY doit renvoyer la même instance que PaymentGateway, pas une copie');
  eq(PaymentGateway.instances, 1, 'nombre de passerelles créées');
});

test('le journal d\'audit reste facultatif', async () => {
  const events: string[] = [];
  const shop = await compile(undefined, { record: (e) => events.push(e) });
  shop.checkout.pay(500);
  eq(events, [], 'AUDIT_SINK d\'un autre module n\'est pas visible de PaymentsModule : rien à journaliser');
});

await run();
