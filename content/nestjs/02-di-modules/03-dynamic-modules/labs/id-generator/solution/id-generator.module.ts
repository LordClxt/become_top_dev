import { ConfigurableModuleBuilder, Inject, Injectable, Module } from '@nestjs/common';

export interface IdGeneratorModuleOptions {
  /** Préfixe de type, sans le tiret bas : 'usr', 'ord'… */
  prefix: string;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<IdGeneratorModuleOptions>()
    .setExtras({ isGlobal: false }, (definition, extras) => ({ ...definition, global: extras.isGlobal }))
    .build();

@Injectable()
export class IdGenerator {
  private next = 0;
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: IdGeneratorModuleOptions) {
    if (!/^[a-z]{2,5}$/.test(options.prefix)) throw new Error(`préfixe invalide : ${options.prefix}`);
  }
  /** `${prefix}_${n}` avec n = 1, 2, 3… propre à chaque instance. */
  generate(): string {
    return `${this.options.prefix}_${++this.next}`;
  }
}

@Module({ providers: [IdGenerator], exports: [IdGenerator] })
export class IdGeneratorModule extends ConfigurableModuleClass {}
