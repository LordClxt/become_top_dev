import 'reflect-metadata';

/** Un jeton : une classe, une chaîne ou un Symbol. */
export type Token = string | symbol | (abstract new (...args: never[]) => unknown);
type Ctor = new (...args: unknown[]) => unknown;
type Recipe = { useValue: unknown } | { useClass: new (...args: never[]) => unknown };

export class ResolutionError extends Error {
  override name = 'ResolutionError';
}

const INJECTABLE = 'boss:injectable';
const INJECT = 'boss:inject';

export function Injectable(): ClassDecorator {
  return (target) => Reflect.defineMetadata(INJECTABLE, true, target);
}

/** Comme @Inject de Nest : on note la position et le jeton, l'injecteur remplacera design:paramtypes. */
export function Inject(token: Token): ParameterDecorator {
  return (target, _key, index) => {
    const list: { index: number; token: Token }[] = Reflect.getOwnMetadata(INJECT, target) ?? [];
    Reflect.defineMetadata(INJECT, [...list, { index, token }], target);
  };
}

const label = (t: Token): string => (typeof t === 'function' ? t.name : String(t));

export class Container {
  private readonly recipes = new Map<Token, Recipe>();
  private readonly instances = new Map<Token, unknown>();
  /** Ordre de création : les dépendances sont toujours créées avant leurs consommateurs. */
  private readonly created: unknown[] = [];

  provide(token: Token, recipe: Recipe): void {
    this.recipes.set(token, recipe);
  }

  get<T>(token: Token): T {
    return this.resolve(token, []) as T;
  }

  async init(): Promise<void> {
    for (const instance of this.created) {
      const hook = (instance as { onInit?: () => unknown }).onInit;
      if (typeof hook === 'function') await hook.call(instance);
    }
  }

  private resolve(token: Token, path: Token[]): unknown {
    if (this.instances.has(token)) return this.instances.get(token);
    if (path.includes(token)) {
      throw new ResolutionError(`dépendance circulaire : ${[...path, token].map(label).join(' -> ')}`);
    }
    const recipe = this.recipes.get(token);
    if (recipe && 'useValue' in recipe) {
      this.instances.set(token, recipe.useValue);
      return recipe.useValue;
    }
    const cls = (recipe ? recipe.useClass : token) as Ctor;
    if (typeof cls !== 'function' || !Reflect.getMetadata(INJECTABLE, cls)) {
      const by = path.length ? ` (demandé par ${label(path[path.length - 1]!)})` : '';
      throw new ResolutionError(`aucun provider pour ${label(token)}${by}`);
    }
    const params: unknown[] = [...(Reflect.getMetadata('design:paramtypes', cls) ?? [])];
    for (const { index, token: t } of Reflect.getMetadata(INJECT, cls) ?? []) params[index] = t;
    const deps = params.map((p, i) => {
      if (p === undefined || p === Object) {
        throw new ResolutionError(`${label(cls)} : dépendance non résolue à l'index [${i}]`);
      }
      return this.resolve(p as Token, [...path, token]);
    });
    const instance = new cls(...deps);
    this.instances.set(token, instance);
    this.created.push(instance);
    return instance;
  }
}
