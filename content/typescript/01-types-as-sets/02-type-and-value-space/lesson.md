---
id: ts-ch01-l02
title: "Espace des types et espace des valeurs"
source: { chapter: 2, pages: "40-45" }
duration_min: 25
concepts:
  - id: ts-two-spaces
    label: "Un même nom peut vivre dans l'espace des types et dans celui des valeurs, avec des sens différents (interface Cylinder + const Cylinder)"
  - id: ts-class-both-spaces
    label: "class et enum créent à la fois un type et une valeur ; interface et type n'ont qu'un type"
  - id: ts-typeof-two-meanings
    label: "typeof x est l'opérateur d'exécution dans une expression, et extrait le type de x dans une position de type"
  - id: ts-indexed-access-type
    label: "T[K] (accès indexé) et keyof sont des opérations de type ; obj['k'] est une valeur"
glossary:
  - term: "espace des types / espace des valeurs"
    definition: "Deux « mondes » de noms : ce qui est effacé à la compilation (types) et ce qui reste au runtime (valeurs). Le même identifiant peut exister dans les deux."
  - term: "accès indexé (indexed access type)"
    definition: "Écriture T[K] qui donne le type de la propriété K de T, comme Person['name']."
visuals: []
labs: [ts-ch01-l02-lab-spaces]
extra: false
xp: 25
---

## Pourquoi c'est important

Dans `const x = Cylinder`, `Cylinder` est une valeur. Dans `let c: Cylinder`, c'est un type. Parfois c'est **le même mot**, avec deux sens. Cette ambiguïté est la source d'erreurs qui déroutent : « only refers to a type, but is being used as a value ». Savoir dans quel espace on est, c'est lire TypeScript sans se tromper.

## Le concept

### Deux espaces, parfois le même nom

```ts
interface Cylinder {
  radius: number;
  height: number;
}
const Cylinder = (radius: number, height: number) => ({ radius, height });

function calculateVolume(shape: unknown) {
  if (shape instanceof Cylinder) {     // Cylinder = la VALEUR (une fonction fléchée)
    shape.radius;                       // erreur : Property 'radius' does not exist on type '{}'
  }
}
```

`instanceof` s'évalue à l'exécution : il lit la valeur `Cylinder` (la fonction), pas l'interface. TypeScript n'a aucun moyen de relier les deux. Les deux homonymes existent côte à côte sans se connaître.

Qui crée quoi :

- `interface`, `type` : **type** seulement ;
- `const`, `let`, `function` : **valeur** seulement ;
- `class`, `enum` : **les deux** (type = les instances, valeur = le constructeur).

### Le même mot-clé, deux sens : `typeof`

```ts
const jane = { first: 'Jane', last: 'Jacobs' };
type T = typeof jane;           // { first: string; last: string }, en position de TYPE
const kind = typeof jane;       // 'object', en position de VALEUR (renvoie une chaîne)
```

Dans une annotation ou un alias, `typeof` extrait le **type** d'une valeur (idéal pour ne pas dupliquer une constante). Dans une expression, c'est l'opérateur JavaScript qui renvoie l'une de huit chaînes (`'string'`, `'object'`…). Sur une classe, `typeof Cylinder` en position de type est le type du **constructeur**, pas des instances : pour les instances, on écrit `Cylinder`.

### Les opérations de type

Ces écritures n'existent que dans le monde des types : `keyof`, `T[K]`, `extends` (conditionnel), le `|` et `&` entre types, `readonly`.

```ts
interface Person { first: string; last: string }
type First = Person['first'];                    // string : accès indexé, un type
const first: Person['first'] = 'Jane';           // OK
const key = 'first';
const v = jane[key];                              // accès à une propriété : une valeur

type K = keyof Person;                            // 'first' | 'last'
```

`Person['first']` et `jane['first']` se ressemblent, mais le premier est effacé et le second s'exécute. Dernier piège, la déstructuration :

```ts
function email({ person, subject }: { person: Person; subject: string }) {}
function email2({ person: Person, subject: string }) {}   // PAS des types : on RENOMME person en « Person »
```

Dans la deuxième, `{ person: Person }` est une déstructuration : la variable locale s'appelle `Person`. Pour typer, il faut écrire le type **après** le motif entier.

## Pièges fréquents

- **Utiliser `instanceof` avec le nom d'une interface** : il n'y a pas de valeur.
- **Confondre `typeof x` valeur et type** : lis la position (annotation = type, expression = valeur).
- **Penser que `T[K]` et `obj[k]` sont interchangeables** : l'un est effacé, l'autre s'exécute.
- **Typer par une déstructuration** (`{ a: string }` dans les paramètres) : c'est un renommage.

## À retenir

- Un identifiant peut désigner un type, une valeur, ou les deux.
- `class` et `enum` créent les deux ; `interface` et `type` seulement un type.
- `typeof` a deux sens selon la position ; `keyof` et `T[K]` n'existent que pour les types.
- Pour connaître l'espace d'un symbole, regarde où il est utilisé (annotation ou expression).
