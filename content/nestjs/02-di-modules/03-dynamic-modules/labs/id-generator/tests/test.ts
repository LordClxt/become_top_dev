import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { check, eq, raises, run, test } from './spec.js';
import { IdGenerator, IdGeneratorModule, MODULE_OPTIONS_TOKEN } from './id-generator.module.js';

@Injectable() class UsersService { constructor(readonly ids: IdGenerator) {} }
@Injectable() class OrdersService { constructor(readonly ids: IdGenerator) {} }

/** Un faux service de configuration, exporté par son propre module. */
@Injectable() class Settings { readonly values: Record<string, string> = { ORDER_PREFIX: 'ord' }; }
@Module({ providers: [Settings], exports: [Settings] }) class SettingsModule {}

test('register : chaque module importateur a son générateur', async () => {
  @Module({ imports: [IdGeneratorModule.register({ prefix: 'usr' })], providers: [UsersService], exports: [UsersService] })
  class UsersModule {}
  @Module({ imports: [IdGeneratorModule.register({ prefix: 'ord' })], providers: [OrdersService], exports: [OrdersService] })
  class OrdersModule {}
  const ref = await Test.createTestingModule({ imports: [UsersModule, OrdersModule] }).compile();
  const users = ref.get(UsersService, { strict: false });
  const orders = ref.get(OrdersService, { strict: false });
  eq([users.ids.generate(), users.ids.generate(), orders.ids.generate()], ['usr_1', 'usr_2', 'ord_1'], 'identifiants générés');
  check(users.ids !== orders.ids, 'les deux modules doivent recevoir deux instances distinctes');
});

test('registerAsync : les options viennent d\'un provider injecté', async () => {
  @Module({
    imports: [IdGeneratorModule.registerAsync({
      imports: [SettingsModule],
      useFactory: (s: Settings) => ({ prefix: s.values.ORDER_PREFIX! }),
      inject: [Settings],
    })],
    providers: [OrdersService],
  })
  class OrdersModule {}
  const ref = await Test.createTestingModule({ imports: [OrdersModule] }).compile();
  eq(ref.get(OrdersService, { strict: false }).ids.generate(), 'ord_1', 'identifiant avec le préfixe lu dans Settings');
});

test('isGlobal : injectable sans import, et absent des options', async () => {
  @Module({ providers: [UsersService] }) class UsersModule {}
  const ref = await Test.createTestingModule({
    imports: [IdGeneratorModule.register({ prefix: 'id', isGlobal: true }), UsersModule],
  }).compile();
  eq(ref.get(UsersService, { strict: false }).ids.generate(), 'id_1', 'générateur global');
  eq(ref.get(MODULE_OPTIONS_TOKEN, { strict: false }), { prefix: 'id' }, 'options injectées (isGlobal est un extra)');
});

test('sans isGlobal, le générateur reste privé au module importateur', async () => {
  @Module({ providers: [UsersService] }) class UsersModule {}
  await raises(() => Test.createTestingModule({
    imports: [IdGeneratorModule.register({ prefix: 'usr' }), UsersModule],
  }).compile(), 'UsersModule n\'importe pas le générateur : la résolution doit échouer');
});

test('un préfixe invalide empêche le démarrage', async () => {
  await raises(() => Test.createTestingModule({
    imports: [IdGeneratorModule.register({ prefix: 'Users!' })],
  }).compile(), 'préfixe « Users! »');
});

await run();
