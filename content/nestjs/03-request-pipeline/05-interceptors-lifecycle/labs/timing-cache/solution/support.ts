import { Injectable } from '@nestjs/common';

/** Horloge injectable : les tests la font avancer à la main. */
@Injectable()
export class Clock {
  now(): number {
    return Date.now();
  }
}

export interface Measure { route: string; outcome: 'ok' | 'error'; ms: number }

@Injectable()
export class Metrics {
  readonly measures: Measure[] = [];
}
