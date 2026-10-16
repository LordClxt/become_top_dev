import { Injectable } from './injector.js';

@Injectable()
export class Clock {
  now() {
    return 42;
  }
}

@Injectable()
export class BooksRepository {
  constructor(readonly clock: Clock) {}
  findAll() {
    return ['Germinal', 'Nana'];
  }
}

@Injectable()
export class BooksService {
  constructor(readonly repo: BooksRepository, readonly clock: Clock) {}
  titles() {
    return this.repo.findAll();
  }
}

/** Pas de décorateur : rien ne dit au conteneur qu'il peut la construire. */
export class Undecorated {}

@Injectable()
export class NeedsUndecorated {
  constructor(readonly u: Undecorated) {}
}

export interface Mailer {
  send(to: string): void;
}

/** Une interface comme type de paramètre : tsc émet Object. */
@Injectable()
export class NeedsInterface {
  constructor(readonly clock: Clock, readonly mailer: Mailer) {}
}

/** Simule un import circulaire : design:paramtypes contient undefined à l'index 1. */
@Injectable()
export class Broken {
  constructor(readonly clock: Clock, readonly other: unknown) {}
}
Reflect.defineMetadata('design:paramtypes', [Clock, undefined], Broken);
