## Contexte

Un collecteur reçoit des événements analytiques en JSON, envoyés par des clients plus ou moins fiables. Tu dois **rétrécir** chaque valeur brute (`unknown`) vers une union taguée, ignorer ce qui est invalide, puis produire un rapport construit d'un coup. Tout le chapitre y passe : `as const`, gardes de type, unions taguées, alias, décomposition conditionnelle.

Tu édites `analytics.ts`.

## À faire

1. `EVENT_KINDS` = `['page_view', 'click', 'purchase']` en tuple de littéraux ; `EventKind` en est dérivé.
2. `parseEvent(raw)` : renvoie un `AppEvent` ou `null`. Règles communes : objet non `null`, `kind` connu, `userId` chaîne non vide, `at` nombre fini. Puis selon le type :
   - `page_view` : `path` chaîne qui commence par `/` ;
   - `click` : `target` chaîne non vide ;
   - `purchase` : `amount` nombre strictement positif, `currency` = `'EUR'` ou `'USD'`.
   Le résultat ne contient **que** les champs du type (les champs inconnus sont ignorés).
3. `isPurchase(e)` : type guard.
4. `report(raws)` : analyse tout puis renvoie
   `{ total, invalid, byKind, users }` (`byKind` : nombre d'événements par type, les trois clés toujours présentes ; `users` : nombre d'utilisateurs distincts), plus `revenue` (un objet `{ EUR, USD }` arrondi au centime) **seulement** s'il y a au moins un achat, et `lastPath` (le `path` du `page_view` le plus récent selon `at`) **seulement** s'il y en a un.
5. `describe(e)` : `switch` exhaustif → `"ada a vu /home"`, `"ada a cliqué sur buy"`, `"ada a payé 9.99 EUR"`.

## Contraintes

Pas de `any`. Les seules assertions permises lisent une propriété d'un objet déjà testé (`Record<string, unknown>`).
