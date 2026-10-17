---
id: ts-ch05-l04
title: "Une union d'interfaces plutôt qu'une interface d'unions"
source: { chapter: 4, pages: "154-158" }
duration_min: 25
concepts:
  - id: ts-interface-of-unions
    label: "Une interface dont chaque propriété est une union (layout: Fill | Line, paint: Fill | Line) autorise des mélanges invalides"
  - id: ts-union-of-interfaces
    label: "Une union d'interfaces taguées (FillLayer | LineLayer) relie les propriétés entre elles et permet le rétrécissement"
  - id: ts-grouped-optionals
    label: "Des propriétés optionnelles qui vont ensemble (date et lieu de naissance) se regroupent dans un seul objet optionnel, ou une union"
glossary:
  - term: "propriété discriminante"
    definition: "Propriété littérale commune aux membres d'une union (type: 'fill' | 'line') qui permet à TypeScript de savoir de quel membre il s'agit."
visuals: []
labs: [ts-ch05-l04-lab-layers]
extra: false
xp: 25
---

## Pourquoi c'est important

C'est un cas particulier très fréquent de la leçon 1 : des propriétés qui **dépendent les unes des autres**, modélisées comme indépendantes. Retourner la structure (une union d'interfaces au lieu d'une interface d'unions) suffit à rendre les états invalides impossibles.

## Le concept

### Une interface d'unions

Une bibliothèque de dessin vectoriel décrit des calques :

```ts
interface Layer {
  layout: FillLayout | LineLayout | PointLayout;
  paint: FillPaint | LinePaint | PointPaint;
}
```

Rien n'empêche un `layout` de ligne avec un `paint` de remplissage. Ce n'est probablement pas voulu, et chaque fonction qui reçoit un `Layer` devra le traiter.

### Une union d'interfaces

```ts
interface FillLayer { type: 'fill'; layout: FillLayout; paint: FillPaint }
interface LineLayer { type: 'line'; layout: LineLayout; paint: LinePaint }
interface PointLayer { type: 'paint'; layout: PointLayout; paint: PointPaint }
type Layer = FillLayer | LineLayer | PointLayer;
```

Les mélanges sont impossibles, et la propriété `type` permet de rétrécir :

```ts
function drawLayer(layer: Layer) {
  if (layer.type === 'fill') {
    const { paint } = layer;     // FillPaint
    const { layout } = layer;    // FillLayout
  }
}
```

C'est l'union taguée vue au module 03, appliquée à la conception.

### Les optionnels qui vont ensemble

```ts
interface Person {
  name: string;
  // les deux sont présents, ou aucun
  placeOfBirth?: string;
  dateOfBirth?: Date;
}
```

Le commentaire signale une relation que le type ignore. Regroupe-les :

```ts
interface Person {
  name: string;
  birth?: { place: string; date: Date };
}
```

`{ name: 'Alan', birth: { place: 'London' } }` est maintenant refusé (`date` manque), et un seul test suffit :

```ts
function eulogize(person: Person) {
  const { birth } = person;
  if (birth) console.log(`was born on ${birth.date} in ${birth.place}.`);
}
```

Si tu ne contrôles pas la structure (une API externe), une union d'interfaces exprime la même relation :

```ts
interface Name { name: string }
interface PersonWithBirth extends Name { placeOfBirth: string; dateOfBirth: Date }
type Person = Name | PersonWithBirth;
// if ('placeOfBirth' in p) { p.dateOfBirth … }   // Date, pas Date | undefined
```

## Pièges fréquents

- **Des propriétés-unions indépendantes** : chaque combinaison devient possible.
- **« Ces deux champs vont ensemble » en commentaire** : regroupe-les dans un objet optionnel.
- **Oublier le tag** : sans propriété discriminante, le rétrécissement passe par `in`, moins lisible.

## À retenir

- Préfère une union d'interfaces taguées à une interface dont les propriétés sont des unions.
- Regroupe les propriétés optionnelles liées dans un seul objet optionnel.
- Le tag permet un `switch` exhaustif et un rétrécissement automatique.
