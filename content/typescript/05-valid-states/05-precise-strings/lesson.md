---
id: ts-ch05-l05
title: "Des types plus précis que string"
source: { chapter: 4, pages: "158-162" }
duration_min: 25
concepts:
  - id: ts-stringly-typed
    label: "Un code « stringly typed » (tout en string) laisse passer des valeurs invalides et des arguments inversés"
  - id: ts-literal-union-domain
    label: "Une union de littéraux ('studio' | 'live') ou un type dédié (Date) décrit le domaine, documente et sécurise"
  - id: ts-keyof-pluck
    label: "keyof T est le type précis d'un nom de propriété : pluck<T, K extends keyof T>(records: T[], key: K): T[K][]"
glossary:
  - term: "stringly typed"
    definition: "Se dit d'un code où des valeurs de natures très différentes sont toutes typées string, ce qui prive le vérificateur de toute information."
visuals: []
labs: [ts-ch05-l05-lab-albums]
extra: false
xp: 25
---

## Pourquoi c'est important

`string` est un ensemble immense. Typer une date, un genre musical ou un nom de propriété en `string`, c'est dire au vérificateur « n'importe quelle chaîne fera l'affaire ». Ce n'est presque jamais vrai. Un type plus précis attrape des erreurs, documente le code et améliore l'autocomplétion.

## Le concept

### Une collection de disques « stringly typed »

```ts
interface Album {
  artist: string;
  title: string;
  releaseDate: string;      // AAAA-MM-JJ
  recordingType: string;    // par exemple "live" ou "studio"
}

const kindOfBlue: Album = {
  artist: 'Miles Davis',
  title: 'Kind of Blue',
  releaseDate: 'August 17th, 1959',   // oups
  recordingType: 'Studio',            // oups
};   // aucune erreur
```

Et les arguments inversés passent aussi : `recordRelease(kindOfBlue.releaseDate, kindOfBlue.title)`, deux chaînes dans le mauvais ordre.

### Des types qui décrivent le domaine

```ts
type RecordingType = 'studio' | 'live';

interface Album {
  artist: string;
  title: string;
  releaseDate: Date;
  recordingType: RecordingType;
}
```

Les deux fautes deviennent des erreurs de compilation, les commentaires disparaissent (les types disent tout), et une fonction qui veut les albums d'un type le dit dans sa signature : `getAlbumsOfType(recordingType: RecordingType)`. Tu peux aussi documenter le sens d'une valeur dans un TSDoc sur le type (« enregistré en studio ou en public ? »), visible au survol.

### keyof : le type d'un nom de propriété

Un exemple subtil : `pluck`, qui extrait une colonne d'un tableau d'objets.

```ts
function pluck(records: any[], key: string): any[] {
  return records.map((r) => r[key]);
}
```

On essaie de le typer avec un générique :

```ts
function pluck<T>(records: T[], key: string): any[] {
  return records.map((r) => r[key]);
  //                       ~~~~~~ Element implicitly has an 'any' type because type 'string' can't be used to index…
}
```

`string` est trop large : une clé doit être un nom de propriété de `T`. C'est exactement `keyof T`. En lui donnant son propre paramètre de type, on obtient même le type précis de la colonne :

```ts
function pluck<T, K extends keyof T>(records: T[], key: K): T[K][] {
  return records.map((r) => r[key]);
}

pluck(albums, 'releaseDate');   // Date[]
pluck(albums, 'artist');        // string[]
pluck(albums, 'recordingDate');
//            ~~~~~~~~~~~~~~~ not assignable to parameter of type keyof Album
```

L'éditeur propose même la liste des clés en autocomplétion.

## Pièges fréquents

- **Une date en `string`** : rien ne vérifie son format ; préfère `Date` (ou un type dédié).
- **Un commentaire « par exemple 'live' ou 'studio' »** : c'est une union de littéraux qui attend d'être écrite.
- **`key: string`** pour un nom de propriété : c'est `keyof T`.
- **`K extends keyof T` sans paramètre dédié** (`key: keyof T`) : le retour devient `T[keyof T][]`, l'union de toutes les colonnes.

## À retenir

- Évite le code « stringly typed » : unions de littéraux, `Date`, types dédiés.
- `keyof T` est le type précis d'un nom de propriété ; `K extends keyof T` garde la colonne exacte.
- Les types précis attrapent les erreurs, documentent et nourrissent l'autocomplétion.
