import { eq, run, test } from './spec.ts';
import { link, Router } from './router.ts';

test('link', () => {
  eq(link('/users/:id/posts/:postId', { id: '7', postId: '42' }), '/users/7/posts/42', 'deux paramètres');
  eq(link('/search/:q', { q: 'a b/c' }), '/search/a%20b%2Fc', 'encodage');
  eq(link('/about'), '/about', 'sans paramètre');
});

test('Router : add, resolve, linkTo', () => {
  const router = new Router()
    .add('/users/:id', ({ id }) => `profil ${id}`)
    .add('/users/:id/posts/:postId', ({ id, postId }) => `billet ${postId} de ${id}`)
    .add('/about', () => 'à propos')
    .add('/users/me', () => 'jamais atteint');
  eq(router.resolve('/users/7'), 'profil 7', 'un paramètre');
  eq(router.resolve('/users/7/posts/42'), 'billet 42 de 7', 'deux paramètres');
  eq(router.resolve('/about'), 'à propos', 'fixe');
  eq(router.resolve('/users/me'), 'profil me', 'la première route qui correspond gagne');
  eq(router.resolve('/search%20x'), null, 'aucune route');
  eq(router.resolve('/users/a%20b'), 'profil a b', 'décodage');
  eq(router.linkTo('/users/:id', { id: '9' }), '/users/9', 'linkTo');
  eq(router.linkTo('/about'), '/about', 'linkTo sans paramètre');
});

await run();
