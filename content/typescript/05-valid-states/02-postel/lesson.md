---
id: ts-ch05-l02
title: "Large en entrée, strict en sortie (et pas de types dans la doc)"
source: { chapter: 4, pages: "142-148" }
duration_min: 30
concepts:
  - id: ts-postel
    label: "Loi de Postel : accepter des types larges en paramètre (plusieurs formes, propriétés optionnelles), mais renvoyer des types stricts et canoniques"
  - id: ts-canonical-form
    label: "On distingue la forme canonique (LngLat, Camera) de la forme acceptée (LngLatLike, CameraOptions), souvent dérivée avec Partial et Omit"
  - id: ts-iterable-param
    label: "Un paramètre Iterable<T> (ou readonly T[]) accepte plus d'arguments qu'un T[] : tableaux, Set, générateurs"
  - id: ts-no-types-in-docs
    label: "Ne pas répéter les types dans les commentaires (ils divergent) ; porter les unités dans les noms (timeMs, temperatureC) et la non-mutation dans readonly"
glossary:
  - term: "loi de Postel (principe de robustesse)"
    definition: "« Sois conservateur dans ce que tu fais, libéral dans ce que tu acceptes des autres. » Formulé pour TCP par Jon Postel."
  - term: "forme canonique"
    definition: "La représentation unique et normalisée d'une valeur (un LngLat est toujours { lng, lat }), par opposition aux variantes acceptées en entrée."
visuals: []
labs: [ts-ch05-l02-lab-camera]
extra: false
xp: 30
---

## Pourquoi c'est important

Une fonction est plus agréable à appeler si elle accepte plusieurs formes d'entrée. Mais si elle **renvoie** aussi plusieurs formes, chaque appelant doit les traiter toutes. Le bon contrat est asymétrique : **large en entrée, strict en sortie**.

## Le concept

### Le problème des types de sortie larges

Une API de carte 3D décrit la caméra et les coordonnées :

```ts
interface CameraOptions {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
}
type LngLat = { lng: number; lat: number } | { lon: number; lat: number } | [number, number];
type LngLatBounds = { northeast: LngLat; southwest: LngLat } | [LngLat, LngLat] | [number, number, number, number];

declare function setCamera(camera: CameraOptions): void;
declare function viewportForBounds(bounds: LngLatBounds): CameraOptions;
```

`setCamera` gagne à accepter tout cela. Mais `viewportForBounds` **renvoie** un `CameraOptions` :

```ts
const camera = viewportForBounds(bounds);
const { center: { lat, lng }, zoom } = camera;
//                ~~~  ~~~ Property 'lat'/'lng' does not exist on type 'LngLat | undefined'
```

Tout est optionnel, `center` a trois formes possibles : l'appelant doit tout tester. (`LngLatBounds` accepte à lui seul 19 formes différentes.)

### Distinguer forme canonique et forme acceptée

```ts
interface LngLat { lng: number; lat: number }
type LngLatLike = LngLat | { lon: number; lat: number } | [number, number];

interface Camera {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
}
interface CameraOptions extends Omit<Partial<Camera>, 'center'> {
  center?: LngLatLike;
}

declare function setCamera(camera: CameraOptions): void;          // large en entrée
declare function viewportForBounds(bounds: LngLatBounds): Camera; // strict en sortie
```

Le type d'entrée est **dérivé** du type canonique (module 02 : `Partial`, `Omit`) : si `Camera` évolue, `CameraOptions` suit. La convention `XLike` (comme `ArrayLike` ou `PromiseLike` de la bibliothèque standard) signale la forme acceptée.

### Les collections

Même idée pour les collections : `sum(xs: Iterable<number>)` accepte un tableau, un `Set`, un générateur ; `xs: number[]` refuserait les deux derniers. Et si la fonction ne modifie rien, `readonly number[]` accepte les tableaux en lecture seule.

### Pas de types dans la documentation

```ts
/**
 * Renvoie une chaîne avec la couleur de premier plan.
 * Prend zéro ou un argument. Sans argument, renvoie la couleur standard.
 */
function getForegroundColor(page?: string): Color { … }   // Color = { r, g, b } !
```

Le commentaire ment déjà : le type dit `{ r, g, b }`, pas une chaîne, et un argument optionnel est visible dans la signature. Le type est **vérifié**, le commentaire non : il finit toujours par diverger. Garde la doc pour ce que le type ne dit pas (le *pourquoi*, les contraintes métier).

- « Ne modifie pas `nums` » → `nums: readonly number[]` (le compilateur le vérifie).
- Une unité ? Mets-la dans le nom : `timeMs`, `temperatureC`, `distanceKm`, plutôt qu'un commentaire « en millisecondes ».

## Pièges fréquents

- **Réutiliser le type d'entrée en sortie** : les appelants héritent de toutes les formes possibles.
- **Recopier `Camera` en version optionnelle à la main** : dérive-la (`Partial`, `Omit`).
- **Un commentaire qui décrit les types** : il sera faux tôt ou tard ; le type suffit.
- **`timeout: number`** : en secondes ou en millisecondes ? Écris `timeoutMs`.

## À retenir

- Types d'entrée larges (unions, optionnels, `Iterable`, `readonly`), types de sortie stricts et canoniques.
- Dérive la forme acceptée de la forme canonique.
- Les types documentent mieux que les commentaires : pas de types en prose, des unités dans les noms.
