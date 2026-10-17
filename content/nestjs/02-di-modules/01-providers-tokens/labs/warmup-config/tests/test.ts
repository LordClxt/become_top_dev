import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { eq, run, test } from './spec.js';
import { ShopModule } from './shop.module.js';
import { GreetingService } from './shop.js';

test('GreetingService reçoit le nom de la boutique', async () => {
  const ref = await Test.createTestingModule({ imports: [ShopModule] }).compile();
  eq(ref.get(GreetingService).greet('Inès'), 'Bienvenue chez La Page Tournée, Inès !', 'message d\'accueil');
});

await run();
