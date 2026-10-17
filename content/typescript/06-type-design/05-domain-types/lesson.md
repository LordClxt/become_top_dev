---
id: ts-ch06-l05
title: "Le langage du domaine, pas les données anecdotiques"
source: { chapter: 4, pages: "177-184" }
duration_min: 30
concepts:
  - id: ts-domain-names
    label: "Nommer types et propriétés avec le vocabulaire du domaine (commonName, genus, ConservationStatus) plutôt que des noms vagues (data, info, item)"
  - id: ts-meaningful-distinctions
    label: "Deux noms différents doivent désigner deux choses différentes ; un même concept garde un seul nom"
  - id: ts-anecdotal-types
    label: "Un type écrit à partir de quelques exemples oublie des cas (GeometryCollection) ; on s'appuie sur la spécification ou des types officiels (@types/geojson)"
  - id: ts-generated-types
    label: "Quand une source de vérité existe (spécification, schéma OpenAPI, JSON Schema), générer les types est plus fiable que les écrire à la main"
glossary:
  - term: "GeoJSON"
    definition: "Format standard (RFC 7946) de données géographiques en JSON : points, lignes, polygones, et collections de géométries."
  - term: "IUCN"
    definition: "Union internationale pour la conservation de la nature, qui classe les espèces par statut de conservation (LC, NT, VU, EN, CR, EW, EX)."
visuals: []
labs: [ts-ch06-l05-lab-geojson]
extra: false
xp: 30
---

## Pourquoi c'est important

Un type est aussi un **texte** que les autres lisent. Bien nommé, il explique le domaine ; mal nommé, il le brouille. Et un type déduit de deux ou trois exemples a toutes les chances d'être faux sur le quatrième.

## Le concept

### Le vocabulaire du domaine

```ts
interface Animal {
  name: string;
  endangered: boolean;
  habitat: string;
}
const leopard: Animal = { name: 'Snow Leopard', endangered: false, habitat: 'tundra' };
```

`name` : nom commun ou nom scientifique ? `endangered: false` pour un léopard des neiges, alors qu'il est « vulnérable » ? `habitat` : n'importe quelle chaîne ? Une version qui parle la langue des biologistes :

```ts
interface Animal {
  commonName: string;
  genus: string;
  species: string;
  status: ConservationStatus;
  climates: KoppenClimate[];
}
type ConservationStatus = 'EX' | 'EW' | 'CR' | 'EN' | 'VU' | 'NT' | 'LC';
type KoppenClimate = 'Af' | 'Am' | 'As' | 'Aw' | 'BSh' | 'BSk' | 'BWh' | 'BWk' | /* … */ 'ET';
```

Chaque nom est précis, et les ensembles de valeurs viennent de standards reconnus (statuts IUCN, classification climatique de Köppen) : un spécialiste les comprend sans explication.

Trois règles :

- **utilise les termes du domaine** plutôt que d'en inventer ;
- **évite les noms vagues** : `data`, `info`, `thing`, `item`, `object`, `entity` ne disent rien ;
- **une distinction de nom = une distinction de sens** : n'appelle pas la même chose `version` ici et `release` là, ni deux choses différentes du même nom.

### Les données anecdotiques

Tu dois calculer la boîte englobante de données GeoJSON. Tu regardes quelques fichiers et tu écris :

```ts
interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry | null;
  properties: unknown;
}
interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}
```

Le code passe sur tes exemples. Mais la spécification GeoJSON définit aussi `MultiPoint`, `MultiLineString` et surtout `GeometryCollection`, qui **n'a pas** de `coordinates` (elle contient d'autres géométries). Le jour où ton code en reçoit une, il plante. En utilisant les types officiels (`@types/geojson`), TypeScript aurait signalé le cas oublié tout de suite :

```ts
import type { Feature, Geometry } from 'geojson';
function helper(geometry: Geometry) {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach(helper);   // récursion
  } else {
    // geometry.coordinates existe ici
  }
}
```

Même idée pour une API : si un schéma **OpenAPI** ou **JSON Schema** existe, génère les types (json-schema-to-typescript, outils OpenAPI) au lieu de les écrire à la main d'après quelques réponses. Pour des données sans schéma, des outils comme quicktype aident, mais ne remplacent pas la spécification. (Les types du DOM de TypeScript sont eux-mêmes générés depuis les spécifications web.)

## Pièges fréquents

- **`data`, `info`, `item`** : des noms qui obligent à lire le code pour comprendre.
- **Un booléen pour une échelle** (`endangered`) : le domaine a souvent un vocabulaire plus fin.
- **Un type écrit d'après tes exemples** : les cas rares manquent, et ce sont eux qui plantent en production.

## À retenir

- Nomme avec le vocabulaire du domaine et des standards reconnus ; évite les noms vagues.
- Un nom différent pour chaque concept différent, et réciproquement.
- Fonde tes types sur une spécification ou des types officiels ; génère-les quand c'est possible.
