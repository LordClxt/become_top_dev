import { Injectable, Module } from '@nestjs/common';

export interface IdGeneratorModuleOptions {
  /** Préfixe de type, sans le tiret bas : 'usr', 'ord'… */
  prefix: string;
}

// TODO : construis la définition du module avec ConfigurableModuleBuilder (register + registerAsync,
// option supplémentaire isGlobal), et exporte MODULE_OPTIONS_TOKEN.
export const MODULE_OPTIONS_TOKEN = 'TODO';

@Injectable()
export class IdGenerator {
  private next = 0;
  /** `${prefix}_${n}` avec n = 1, 2, 3… propre à chaque instance. */
  generate(): string {
    throw new Error('TODO: injecter les options et générer l\'identifiant');
  }
}

@Module({})
export class IdGeneratorModule {}
