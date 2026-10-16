---
id: ts-ch00-l04
title: "Le typage structurel"
source: { chapter: 1, pages: "18-22" }
duration_min: 25
concepts:
  - id: ts-structural-typing
    label: "Typage structurel : une valeur convient à un type dès qu'elle a les propriétés requises, quelle que soit sa classe ou sa déclaration"
  - id: ts-open-types
    label: "Les types sont « ouverts » : une valeur peut avoir plus de propriétés que son type n'en déclare (Object.keys renvoie string[])"
  - id: ts-narrow-interface
    label: "Déclarer l'interface étroite dont une fonction a besoin permet de la tester sans mock ni dépendance lourde"
glossary:
  - term: "typage structurel"
    definition: "Deux types sont compatibles si leur forme l'est. Contraire du typage nominal (Java, C#) où il faut déclarer la relation."
  - term: "duck typing"
    definition: "« Si ça marche comme un canard et cancane comme un canard… » : on ne regarde que ce que la valeur sait faire."
  - term: "type ouvert"
    definition: "Type qui n'interdit pas les propriétés supplémentaires : { x: number } accepte aussi { x: 1, y: 2 }."
visuals: []
labs: [ts-ch00-l04-lab-narrow-db]
extra: false
xp: 25
---

## Pourquoi c'est important

JavaScript pratique le *duck typing* : une fonction qui reçoit un objet avec les bonnes propriétés se moque de savoir comment il a été fabriqué. TypeScript modélise ce comportement avec un système **structurel**. Si tu viens de Java ou de C#, où une classe doit déclarer `implements Interface`, c'est la différence qui t'étonnera le plus : tu verras des erreurs qui n'en sont pas, et surtout des **absences d'erreur** qui piègent.

## Le concept

### Compatible parce que la forme est la bonne

```ts
interface Vector2D { x: number; y: number }

function calculateLength(v: Vector2D) {
  return Math.sqrt(v.x ** 2 + v.y ** 2);
}

interface NamedVector { name: string; x: number; y: number }

const v: NamedVector = { name: 'a', x: 3, y: 4 };
calculateLength(v);   // OK : 5
```

`NamedVector` n'a jamais déclaré qu'il était un `Vector2D`. Il a `x` et `y` de type `number`, ça suffit. Comme TypeScript ne regarde que la forme, ce code est aussi correct que la version Java qui exigerait un `implements`.

### Premier piège : un type plus grand que prévu

Tu ajoutes les vecteurs 3D :

```ts
interface Vector3D { x: number; y: number; z: number }

function normalize(v: Vector3D) {
  const length = calculateLength(v);          // accepté : un Vector3D a x et y
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}
```

Aucune erreur, mais `calculateLength` ignore `z` : `normalize({x: 3, y: 4, z: 5})` n'a pas une longueur de 1. Le vérificateur a eu raison au sens strict (un `Vector3D` *est* un `Vector2D` structurellement) alors que ton intention était autre. La parade consiste à accepter explicitement les deux formes et à tester `'z' in v` (c'est le lab), ou à étiqueter les variantes avec une balise `kind` (leçon 3). Retiens surtout qu'un paramètre `{x, y}` accepte **tout objet qui a au moins** `x` et `y`.

Autre conséquence de ces types ouverts, plus tard dans le cours : `Object.keys(v)` renvoie `string[]` et non `('x' | 'y')[]`, parce que `v` peut avoir d'autres clés. On ne peut donc pas boucler naïvement sur les clés d'un objet en gardant leur type (item 60).

### Les classes aussi sont structurelles

```ts
class SmallNumContainer {
  num: number;
  constructor(num: number) {
    if (num < 0 || num >= 10) throw new Error(`${num} must be in [0, 10)`);
    this.num = num;
  }
}

const a: SmallNumContainer = new SmallNumContainer(5);
const b: SmallNumContainer = { num: 2024 };   // accepté ! Le constructeur n'a pas été appelé
```

La garantie « `num` vaut entre 0 et 10 » n'existe que si la valeur passe par le constructeur ; le type, lui, n'exige que la forme. Si une invariante doit être garantie, il faut un autre outil (une propriété privée `#`, une marque nominale : module 10).

### L'atout : des tests sans mock

Soit une fonction qui lit des auteurs dans une base :

```ts
import { PostgresDB } from './db';

async function getAuthors(db: PostgresDB) {
  const rows = await db.runQuery('SELECT name FROM authors');
  return rows.map((row) => row.name);
}
```

Pour la tester sans vraie base, un langage nominal te demande un mock (une sous-classe, une bibliothèque de simulation). Avec le typage structurel, tu **déclares ce dont la fonction a besoin** :

```ts
interface QueryRunner {
  runQuery(sql: string): Promise<{ name: string }[]>;
}

async function getAuthors(db: QueryRunner) {
  const rows = await db.runQuery('SELECT name FROM authors');
  return rows.map((row) => row.name);
}
```

`PostgresDB` convient toujours (il a une méthode `runQuery` compatible), et dans le test :

```ts
const fake: QueryRunner = { runQuery: async () => [{ name: 'Camus' }] };
await getAuthors(fake);
```

La fonction exprime maintenant précisément sa dépendance, sans couplage à un pilote de base. C'est le principe de ségrégation des interfaces sans la cérémonie. Tu l'appliqueras dans le lab, en plus de corriger le piège des vecteurs.

## Pièges fréquents

- **Supposer que « ça n'a pas la bonne classe » produira une erreur** : seule la forme compte.
- **Itérer sur `Object.keys` en s'attendant à des clés typées** : les types sont ouverts.
- **Compter sur un constructeur pour faire respecter une invariante** : n'importe quel littéral de la bonne forme y échappe.
- **Dépendre d'un type concret de bibliothèque dans la signature** : une interface étroite est plus facile à tester et à remplacer.

## À retenir

- TypeScript est structurel : une valeur est compatible si elle a les propriétés requises.
- Les types sont ouverts ; une valeur peut avoir plus de propriétés que son type n'en annonce.
- Les classes sont structurelles aussi ; le constructeur ne garantit rien au niveau du type.
- Déclare l'interface étroite de ce dont ta fonction a besoin : elle se teste avec un simple objet littéral.
