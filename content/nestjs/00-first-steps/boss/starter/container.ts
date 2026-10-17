import 'reflect-metadata';

/** Un jeton : une classe, une chaîne ou un Symbol. */
export type Token = string | symbol | (abstract new (...args: never[]) => unknown);

export class ResolutionError extends Error {
  override name = 'ResolutionError';
}

// Lis instructions.md : Injectable, Inject et Container sont à écrire.
export function Injectable(): ClassDecorator {
  throw new Error('TODO');
}

export function Inject(_token: Token): ParameterDecorator {
  throw new Error('TODO');
}

export class Container {
  provide(_token: Token, _recipe: { useValue: unknown } | { useClass: new (...args: never[]) => unknown }): void {
    throw new Error('TODO');
  }
  get<T>(_token: Token): T {
    throw new Error('TODO');
  }
  async init(): Promise<void> {
    throw new Error('TODO');
  }
}
