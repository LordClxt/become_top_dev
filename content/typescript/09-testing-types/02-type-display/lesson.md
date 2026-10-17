---
id: ts-ch09-l02
title: "Soigner l'affichage des types"
source: { chapter: 6, pages: "248-252" }
duration_min: 25
concepts:
  - id: ts-type-display-matters
    label: "Le type affiché au survol et dans les erreurs fait partie de l'expérience d'une API : Partial<Pick<T, K>> & Omit<T, K> est illisible"
  - id: ts-resolve-type
    label: "Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] } aplatit une intersection en un objet lisible (et la rend égale pour Equals)"
  - id: ts-resolve-limits
    label: "Resolve est superficiel (pas de DeepResolve : il casserait Date, Map…) et doit traiter les cas spéciaux comme never ([K] extends [never])"
glossary:
  - term: "Resolve (ou Prettify, Simplify)"
    definition: "Type utilitaire qui force TypeScript à calculer et afficher un objet aplati plutôt qu'une composition de génériques."
visuals: []
labs: [ts-ch09-l02-lab-resolve]
extra: false
xp: 25
---

## Pourquoi c'est important

Quand un utilisateur survole un appel de ta fonction, ou lit un message d'erreur, il voit le type tel que TypeScript l'**affiche**. Deux types équivalents peuvent s'afficher de façon très différente. Pour une bibliothèque, c'est une partie de l'ergonomie.

## Le concept

### Un type correct mais illisible

Un type qui rend certaines clés optionnelles :

```ts
type PartiallyPartial<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

interface BlogComment { commentId: number; title: string; content: string }
type PartComment = PartiallyPartial<BlogComment, 'title'>;
//   ^? type PartComment = Partial<Pick<BlogComment, "title">> & Omit<BlogComment, "title">
```

Correct, mais il faut tout dérouler de tête pour savoir ce que contient l'objet.

### Resolve

```ts
type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

type PartiallyPartial<T extends object, K extends keyof T> = Resolve<Partial<Pick<T, K>> & Omit<T, K>>;
type PartComment = PartiallyPartial<BlogComment, 'title'>;
//   ^? type PartComment = { title?: string; commentId: number; content: string }
```

Le type mappé oblige TypeScript à calculer chaque propriété : l'intersection est aplatie. La garde `T extends Function` laisse les fonctions intactes (un type mappé les transformerait en objets vides). Bonus : `Resolve` rend un type **égal** à sa version aplatie pour `Equals` (leçon précédente).

### Les limites

- **Pas de `DeepResolve`** : appliqué récursivement, il « ouvrirait » `Date`, `Map` ou les classes en une liste de méthodes. Garde-le superficiel.
- **Les cas spéciaux** : si `K` est `never` (aucune clé à rendre optionnelle), on veut `T` lui-même, affiché par son nom. On l'écrit avec un test non distributif :

```ts
type PartiallyPartial<T extends object, K extends keyof T> =
  [K] extends [never] ? T : Resolve<Partial<Pick<T, K>> & Omit<T, K>>;
```

- **L'ordre des unions** affiché peut varier (`'b' | 'a'`) : il dépend de l'ordre de création des types, pas de ton code. N'y attache pas de sens.

### Tester l'affichage

L'affichage d'un type peut régresser comme sa valeur : teste-le. `eslint-plugin-expect-type` vérifie le texte affiché (`// ^? type PartComment = { … }`), et `Equals` vérifie la forme aplatie (leçon précédente).

## Pièges fréquents

- **Exposer des compositions de génériques** dans une API publique : survols et erreurs illisibles.
- **Resolve sans garde pour les fonctions** : elles deviennent `{}`.
- **Un Resolve récursif** : il défigure les classes intégrées.

## À retenir

- L'affichage des types fait partie de l'API.
- `Resolve<T>` aplatit les intersections ; garde les fonctions intactes.
- Traite les cas spéciaux (`never`) et reste superficiel.
