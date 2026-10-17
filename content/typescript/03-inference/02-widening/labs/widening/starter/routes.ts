// TODO 1 : un tuple de littéraux (as const) et HttpMethod dérivé du tableau.
export const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
export type HttpMethod = string;

export function isMethod(s: string): boolean {
  throw new Error('TODO: isMethod');
}

export interface Route {
  method: HttpMethod;
  path: string;
}

// TODO 2 : garde les clés précises tout en vérifiant chaque entrée contre Route (satisfies).
export const routes: Record<string, Route> = {
  home: { method: 'GET', path: '/' },
  createUser: { method: 'POST', path: '/users' },
  deleteUser: { method: 'DELETE', path: '/users/:id' },
};
export type RouteName = keyof typeof routes;

// TODO 3 : renvoie ses arguments avec un type tuple.
export function tuple(...elements: unknown[]): unknown[] {
  throw new Error('TODO: tuple');
}

// TODO 4 : le nom de la route qui correspond, sinon undefined.
export function findRoute(method: HttpMethod, path: string): RouteName | undefined {
  throw new Error('TODO: findRoute');
}
