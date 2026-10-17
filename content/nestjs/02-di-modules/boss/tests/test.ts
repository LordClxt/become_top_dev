import 'reflect-metadata';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, raises, run, test } from './spec.js';
import * as N from './notifications.js';

/* Le contrat imposé par instructions.md, vu par les tests. */
const { NotificationsModule, NotificationsService } = N as unknown as {
  NotificationsModule: {
    forRoot(o: object): never;
    forRootAsync(o: object): never;
  };
  NotificationsService: (abstract new (...a: never[]) => {
    send(tenant: string, to: string, text: string, channel?: string): string;
  }) & { instances: number };
};

/** Une fausse configuration, exportée par son module. */
@Injectable() class Settings { readonly channel = 'sms'; readonly sms = 'LIBRAIRIE'; }
@Module({ providers: [Settings], exports: [Settings] }) class SettingsModule {}

const OPTIONS = { defaultChannel: 'email', senders: { email: 'contact@librairie.fr', sms: 'LIBRAIRIE' } };

async function withApp(imports: unknown[], body: (http: ReturnType<typeof request>) => Promise<void>) {
  const ref = await Test.createTestingModule({ imports: imports as never[] }).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('forRoot : envoi par le canal par défaut ou choisi', () => withApp([NotificationsModule.forRoot(OPTIONS)], async (http) => {
  const a = await http.post('/notifications').set('x-tenant-id', 't1').send({ to: 'ines@x.fr', text: 'Commande prête' });
  eq([a.status, a.body.receipt], [201, 'email:contact@librairie.fr->ines@x.fr:Commande prête'], 'canal par défaut');
  const b = await http.post('/notifications').set('x-tenant-id', 't1').send({ to: '0600', text: 'Votre commande est prête en boutique', channel: 'sms' });
  eq(b.body.receipt, 'sms:LIBRAIRIE->0600:Votre commande est p', 'canal sms');
  eq((await http.post('/notifications').set('x-tenant-id', 't1').send({ to: 'x', text: 'y', channel: 'fax' })).status, 400, 'canal inconnu');
  eq((await http.post('/notifications').send({ to: 'x', text: 'y' })).status, 400, 'sans x-tenant-id');
}));

test('forRootAsync : options lues dans un provider injecté', () => withApp([NotificationsModule.forRootAsync({
  imports: [SettingsModule],
  useFactory: (s: Settings) => ({ defaultChannel: s.channel, senders: { email: 'a@b.fr', sms: s.sms } }),
  inject: [Settings],
})], async (http) => {
  const res = await http.post('/notifications').set('x-tenant-id', 't1').send({ to: '0700', text: 'Bonjour' });
  eq(res.body.receipt, 'sms:LIBRAIRIE->0700:Bonjour', 'reçu avec la configuration asynchrone');
}));

test('les locataires sont isolés, même en parallèle', () => withApp([NotificationsModule.forRoot(OPTIONS)], async (http) => {
  await Promise.all(['t1', 't2', 't1', 't2'].map((t, i) =>
    http.post('/notifications').set('x-tenant-id', t).send({ to: `c${i}@x.fr`, text: `m${i}` })));
  const t1 = (await http.get('/notifications').set('x-tenant-id', 't1')).body as string[];
  const t2 = (await http.get('/notifications').set('x-tenant-id', 't2')).body as string[];
  eq([t1.length, t2.length], [2, 2], 'nombre de messages par locataire');
  check(t1.every((r) => /c[02]@/.test(r)) && t2.every((r) => /c[13]@/.test(r)), 'chaque locataire ne voit que ses messages');
}));

test('NotificationsService reste un singleton sous la charge', async () => {
  NotificationsService.instances = 0;
  await withApp([NotificationsModule.forRoot(OPTIONS)], async (http) => {
    await Promise.all([1, 2, 3, 4, 5].map(() =>
      http.post('/notifications').set('x-tenant-id', 't1').send({ to: 'a', text: 'b' })));
  });
  eq(NotificationsService.instances, 1, 'instances de NotificationsService pour 5 requêtes');
});

test('isGlobal : injectable ailleurs sans import, privé sinon', async () => {
  @Injectable() class Orders { constructor(readonly n: InstanceType<typeof NotificationsService>) {} }
  Reflect.defineMetadata('design:paramtypes', [NotificationsService], Orders);
  @Module({ providers: [Orders] }) class OrdersModule {}
  const ref = await Test.createTestingModule({
    imports: [NotificationsModule.forRoot({ ...OPTIONS, isGlobal: true }), OrdersModule],
  }).compile();
  eq(ref.get(Orders, { strict: false }).n.send('t1', 'a@b.fr', 'ok'), 'email:contact@librairie.fr->a@b.fr:ok', 'envoi depuis un autre module');
  await raises(() => Test.createTestingModule({ imports: [NotificationsModule.forRoot(OPTIONS), OrdersModule] }).compile(),
    'sans isGlobal, OrdersModule ne doit pas voir NotificationsService');
});

test('une configuration invalide empêche le démarrage', async () => {
  await raises(() => Test.createTestingModule({
    imports: [NotificationsModule.forRoot({ ...OPTIONS, defaultChannel: 'pigeon' })],
  }).compile(), 'defaultChannel « pigeon »');
});

test('ni contournement ni portée par requête', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const code = readdirSync(dir).filter((f) => f.endsWith('.js') && !['test.js', 'spec.js'].includes(f))
    .map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
  check(!/forwardRef|ModuleRef|@Global/.test(code), 'forwardRef, ModuleRef et @Global sont interdits');
  check(!/Scope\.REQUEST|\bREQUEST\b/.test(code), 'aucun provider request-scoped : le locataire se lit à la frontière');
});

await run();
