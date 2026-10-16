import 'reflect-metadata';

/** Clé de métadonnée posée par @Injectable(). */
export const INJECTABLE = 'btd:injectable';

/** Toute classe (constructeur) : le jeton d'injection. */
export type Ctor<T = unknown> = new (...args: any[]) => T;

export class ResolutionError extends Error {
  override name = 'ResolutionError';
}

/** Décorateur de classe : marque la classe comme injectable. */
export function Injectable(): ClassDecorator {
  return () => {
    // TODO : poser la métadonnée INJECTABLE sur la classe
  };
}

export class Container {
  register<T>(cls: Ctor<T>, instance: T): void {
    throw new Error('TODO: register');
  }

  resolve<T>(cls: Ctor<T>): T {
    throw new Error('TODO: resolve');
  }
}
