import { Injectable, Module } from '@nestjs/common';

// Lis instructions.md : tout est à construire ici.
export const RequireScopes = (..._scopes: string[]): MethodDecorator & ClassDecorator => () => {};
export const RawResponse = (): MethodDecorator => () => {};
export const CurrentPartner = (): ParameterDecorator => () => {};

/** Horloge injectable : les tests la remplacent. */
@Injectable()
export class Clock {
  now(): number {
    return Date.now();
  }
}

@Module({ providers: [Clock] })
export class PartnersModule {}
