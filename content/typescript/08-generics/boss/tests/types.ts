import type { Equals, Expect } from './expect.ts';
import { link, Router } from './router.ts';
import type { LinkArgs, RouteParams } from './router.ts';

const router = new Router().add('/users/:id', ({ id }) => id).add('/about', () => 'a');

export type Checks = [
  Expect<Equals<RouteParams<'/users/:id/posts/:postId'>, { id: string; postId: string }>>,
  Expect<Equals<RouteParams<'/about'>, {}>>,
  Expect<Equals<LinkArgs<'/about'>, []>>,
  Expect<Equals<LinkArgs<'/users/:id'>, [params: { id: string }]>>,
  Expect<Equals<typeof router, Router<'/users/:id' | '/about'>>>,
];

// @ts-expect-error paramètre manquant
link('/users/:id', {});
// @ts-expect-error une route sans paramètre ne prend pas de deuxième argument
link('/about', {});
// @ts-expect-error paramètres obligatoires
link('/users/:id');
// @ts-expect-error route non déclarée dans ce routeur
router.linkTo('/teams/:id', { id: '1' });
// @ts-expect-error le handler ne reçoit que les paramètres du motif
new Router().add('/users/:id', ({ postId }) => postId);
