---
id: ts-ch05-l01
title: "Des types qui représentent toujours un état valide"
source: { chapter: 4, pages: "137-142" }
duration_min: 30
concepts:
  - id: ts-invalid-states
    label: "Un type qui autorise des combinaisons invalides (isLoading et error à la fois) rend le code ambigu et bogué"
  - id: ts-state-union
    label: "Une union taguée d'états (pending | error | ok) garantit qu'une valeur est dans un seul état à la fois, avec les seules données qui ont du sens"
  - id: ts-state-per-request
    label: "Suivre l'état par requête (et la page courante à part) élimine les problèmes de courses entre réponses"
  - id: ts-unrepresentable-design
    label: "Si aucune implémentation correcte n'est possible avec un type d'entrée (les deux manches de l'A330), c'est le type qu'il faut changer"
glossary:
  - term: "état invalide"
    definition: "Combinaison de valeurs que le type autorise mais qui n'a aucun sens dans le domaine (chargement terminé ET en cours)."
visuals: []
labs: [ts-ch05-l01-lab-page-state]
extra: false
xp: 30
---

## Pourquoi c'est important

La règle centrale de la conception de types : **un type ne devrait représenter que des états valides**. Quand le type autorise des combinaisons absurdes, chaque fonction doit deviner quoi en faire, et elle se trompe tôt ou tard. Quand il ne les autorise pas, le code devient évident.

## Le concept

### Un état de page ambigu

Une application web charge une page et affiche son contenu :

```ts
interface State {
  pageText: string;
  isLoading: boolean;
  error?: string;
}

function renderPage(state: State) {
  if (state.error) {
    return `Error! Unable to load ${currentPage}: ${state.error}`;
  } else if (state.isLoading) {
    return `Loading ${currentPage}...`;
  }
  return `<h1>${currentPage}</h1>\n${state.pageText}`;
}
```

Et si `isLoading` est vrai **et** `error` défini ? On est en train de réessayer, ou l'erreur est périmée ? Le type ne le dit pas. La fonction qui change de page a ses propres bugs : elle oublie de remettre `isLoading` à `false` en cas d'erreur, n'efface pas l'erreur précédente, et si l'utilisateur change encore de page pendant le chargement, la **première** réponse peut écraser la seconde.

### Un état par requête

```ts
interface RequestPending { state: 'pending' }
interface RequestError { state: 'error'; error: string }
interface RequestSuccess { state: 'ok'; pageText: string }
type RequestState = RequestPending | RequestError | RequestSuccess;

interface State {
  currentPage: string;
  requests: { [page: string]: RequestState };
}
```

Chaque requête est dans **un seul** état, et chaque état porte **seulement** les données qui ont du sens (le texte n'existe qu'en cas de succès, le message qu'en cas d'erreur). Le rendu devient un `switch` sans ambiguïté :

```ts
function renderPage(state: State) {
  const { currentPage } = state;
  const requestState = state.requests[currentPage];
  switch (requestState.state) {
    case 'pending': return `Loading ${currentPage}...`;
    case 'error':   return `Error! Unable to load ${currentPage}: ${requestState.error}`;
    case 'ok':      return `<h1>${currentPage}</h1>\n${requestState.pageText}`;
  }
}
```

Si l'utilisateur change de page pendant un chargement, l'ancienne requête se termine quand même, mais elle met à jour **sa** case ; elle n'affecte pas l'affichage de la page courante.

### Le vol Air France 447

Le livre rappelle un exemple plus grave : l'Airbus A330 avait deux manches indépendants (pilote et copilote), modélisés par deux angles. Quelle fonction écrire pour obtenir **l'**angle à appliquer ? Prendre la gauche, la droite, la moyenne ? Aucune réponse n'est juste. Lors de l'accident, le pilote poussait le manche en avant pendant que le copilote tirait en arrière : la moyenne valait à peu près zéro. Leçon : **si aucune implémentation correcte n'est possible pour un type d'entrée, c'est le type qui est faux.** La plupart des avions relient mécaniquement les deux manches : un seul angle, `stickAngle`.

## Pièges fréquents

- **Des booléens indépendants** (`isLoading`, `hasError`) : ils créent 2ⁿ combinaisons, dont la plupart sont absurdes.
- **Des champs optionnels « au cas où »** (`error?`, `data?`) : préfère une variante par état.
- **Un seul état global pour plusieurs requêtes** : les réponses en retard écrasent les récentes.

## À retenir

- Conçois tes types pour que les états invalides soient impossibles à représenter.
- Une union taguée d'états porte exactement les données valides de chaque état.
- Quand une fonction ne peut pas être écrite correctement, remets en cause le type d'entrée.
