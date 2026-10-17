// TODO 1 et 2
export type RouteParams<P extends string> = Record<string, string>;
export type LinkArgs<P extends string> = [params?: Record<string, string>];

// TODO 3
export function link<P extends string>(pattern: P, ...args: LinkArgs<P>): string {
  throw new Error('TODO: link');
}

// TODO 4
export class Router<Routes extends string = never> {
  add<P extends string>(pattern: P, handler: (params: RouteParams<P>) => string): Router<Routes | P> {
    throw new Error('TODO: add');
  }

  resolve(path: string): string | null {
    throw new Error('TODO: resolve');
  }

  linkTo<P extends string>(pattern: P, ...args: LinkArgs<P>): string {
    throw new Error('TODO: linkTo');
  }
}
