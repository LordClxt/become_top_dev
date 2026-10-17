## Contexte

Tu écris un petit routeur dont **les types se déduisent des motifs** : `'/users/:id/posts/:postId'` donne des paramètres `{ id: string; postId: string }` au handler, et `link('/users/:id', { id: '7' })` refuse un paramètre manquant, ou un deuxième argument pour une route sans paramètre.

Tu édites `router.ts`.

## À faire

1. `RouteParams<P>` : les paramètres d'un motif (`{}` s'il n'y en a pas).
2. `LinkArgs<P>` : `[]` si le motif n'a pas de paramètre, sinon `[params: RouteParams<P>]` (attention à tester « aucune clé » sans distribution parasite).
3. `link(pattern, ...args)` : construit le chemin (`link('/users/:id', { id: '7' })` → `'/users/7'`), paramètres encodés avec `encodeURIComponent`.
4. `Router<Routes>` (constructeur public : `new Router()` donne `Router<never>`) :
   - `add(pattern, handler)` : `handler` reçoit `RouteParams<P>` et renvoie une chaîne ; `add` renvoie le routeur avec le type `Router<Routes | P>` (enchaînable) ;
   - `resolve(path)` : le résultat du **premier** handler dont le motif correspond (même nombre de segments, segments fixes égaux, paramètres décodés), sinon `null` ;
   - `linkTo(pattern, ...args)` : comme `link`, mais `pattern` doit être une route **déjà ajoutée** (`P extends Routes`).

## Contraintes

Pas de `any`. Au plus une assertion par fonction, justifiée.
