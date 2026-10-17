## Contexte

L'application du livre charge des pages wiki. Tu remplaces l'état ambigu (`isLoading`, `error?`, `pageText`) par le modèle de la leçon : une page courante et **un état par requête**. Les fonctions sont pures : elles renvoient un nouvel état.

Tu édites `page.ts`.

## À faire

1. `RequestState` : union taguée sur `state` (`'pending'`, `'error'` avec `error`, `'ok'` avec `pageText`).
2. `navigate(state, page)` : la page devient courante ; si elle n'a jamais été demandée **ou** a échoué, son état passe à `pending` ; une page déjà chargée (`ok`) ou en cours reste telle quelle.
3. `succeeded(state, page, text)` et `failed(state, page, error)` : mettent à jour la requête de `page` uniquement (même si ce n'est plus la page courante).
4. `render(state)` : `"Chargement de X…"`, `"Erreur sur X : message"`, `"<h1>X</h1>\ntexte"` ; si la page courante n'a pas d'état, `"X : rien à afficher"`.
5. `pagesToFetch(state)` : les pages `pending`, triées.

## Contraintes

Aucune mutation de l'état reçu. Pas de booléen `isLoading` : tout passe par l'union.
