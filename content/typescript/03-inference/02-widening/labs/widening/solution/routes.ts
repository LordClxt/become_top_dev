export const METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
export type HttpMethod = (typeof METHODS)[number];

export function isMethod(s: string): s is HttpMethod {
  return (METHODS as readonly string[]).includes(s);
}

export interface Route {
  method: HttpMethod;
  path: string;
}

/** satisfies vérifie chaque route sans élargir les clés de la table. */
export const routes = {
  home: { method: 'GET', path: '/' },
  createUser: { method: 'POST', path: '/users' },
  deleteUser: { method: 'DELETE', path: '/users/:id' },
} satisfies Record<string, Route>;
export type RouteName = keyof typeof routes;

export function tuple<T extends unknown[]>(...elements: T): T {
  return elements;
}

export function findRoute(method: HttpMethod, path: string): RouteName | undefined {
  for (const [name, route] of Object.entries(routes)) {
    // Assertion justifiée : Object.entries renvoie des clés string, mais ce sont celles de routes.
    if (route.method === method && route.path === path) return name as RouteName;
  }
  return undefined;
}
