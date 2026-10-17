export type RouteParams<P extends string> =
  P extends `${string}:${infer Param}/${infer Rest}` ? { [K in Param | keyof RouteParams<Rest>]: string } :
  P extends `${string}:${infer Param}` ? { [K in Param]: string } :
  {};

/** [keyof …] extends [never] : test non distributif de « aucune clé ». */
export type LinkArgs<P extends string> = [keyof RouteParams<P>] extends [never] ? [] : [params: RouteParams<P>];

export function link<P extends string>(pattern: P, ...args: LinkArgs<P>): string {
  const params: Record<string, string> = args[0] ?? {};
  return pattern.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''));
}

interface Route {
  pattern: string;
  handler: (params: Record<string, string>) => string;
}

function match(pattern: string, path: string): Record<string, string> | null {
  const expected = pattern.split('/');
  const actual = path.split('/');
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (const [i, segment] of expected.entries()) {
    const value = actual[i] ?? '';
    if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(value);
    else if (segment !== value) return null;
  }
  return params;
}

export class Router<Routes extends string = never> {
  private readonly routes: Route[] = [];

  add<P extends string>(pattern: P, handler: (params: RouteParams<P>) => string): Router<Routes | P> {
    // Assertion justifiée : match() extrait exactement les paramètres `:nom` de pattern, ce que décrit RouteParams<P>.
    this.routes.push({ pattern, handler: handler as (params: Record<string, string>) => string });
    return this;
  }

  resolve(path: string): string | null {
    for (const { pattern, handler } of this.routes) {
      const params = match(pattern, path);
      if (params) return handler(params);
    }
    return null;
  }

  linkTo<P extends Routes>(pattern: P, ...args: LinkArgs<P>): string {
    return link(pattern, ...args);
  }
}
