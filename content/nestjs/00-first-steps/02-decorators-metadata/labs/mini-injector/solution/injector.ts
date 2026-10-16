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
  return (target) => {
    Reflect.defineMetadata(INJECTABLE, true, target);
  };
}

export class Container {
  private readonly instances = new Map<Function, unknown>();

  register<T>(cls: Ctor<T>, instance: T): void {
    this.instances.set(cls, instance);
  }

  resolve<T>(cls: Ctor<T>): T {
    if (this.instances.has(cls)) return this.instances.get(cls) as T;
    if (Reflect.getMetadata(INJECTABLE, cls) !== true) {
      throw new ResolutionError(`${cls.name} n'est pas injectable : ajoute @Injectable()`);
    }
    const paramtypes: unknown[] = Reflect.getMetadata('design:paramtypes', cls) ?? [];
    const deps = paramtypes.map((dep, i) => {
      if (dep === undefined) {
        throw new ResolutionError(
          `${cls.name} : le paramètre à l'index [${i}] vaut undefined à l'exécution (import circulaire ?)`,
        );
      }
      if (dep === Object) {
        throw new ResolutionError(
          `${cls.name} : le paramètre à l'index [${i}] a le type Object (interface ou import type ?)`,
        );
      }
      return this.resolve(dep as Ctor);
    });
    const instance = new cls(...deps);
    this.instances.set(cls, instance);
    return instance;
  }
}
