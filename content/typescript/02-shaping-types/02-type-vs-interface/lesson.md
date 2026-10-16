---
id: ts-ch02-l02
title: "type ou interface : les différences qui comptent"
source: { chapter: 2, pages: "60-66" }
duration_min: 25
concepts:
  - id: ts-type-interface-similar
    label: "Pour les objets, type et interface se valent presque : signatures d'index, fonctions, génériques, implements, extends croisés"
  - id: ts-interface-extends-checks
    label: "interface extends vérifie la compatibilité des propriétés redéclarées, alors que l'intersection & ne vérifie rien"
  - id: ts-declaration-merging
    label: "Seules les interfaces fusionnent : deux déclarations du même nom s'additionnent (augmentation de type)"
  - id: ts-union-needs-type
    label: "Une union, un tuple ou un type calculé exigent type ; une interface ne les exprime pas"
glossary:
  - term: "declaration merging"
    definition: "Fusion de plusieurs déclarations d'interface du même nom en une seule. Sert à enrichir un type existant (ex. Array, Window)."
  - term: "augmentation de type"
    definition: "Ajout de membres à un type déjà déclaré ailleurs, via le declaration merging."
visuals: []
labs: [ts-ch02-l02-lab-type-interface]
extra: false
xp: 25
---

## Pourquoi c'est important

Les deux écritures sont partout dans le code TypeScript :

```ts
type TState = { name: string; capital: string };
interface IState { name: string; capital: string }
```

Quand utiliser laquelle ? Beaucoup de projets décident au hasard. En réalité, les différences sont peu nombreuses et précises : les connaître permet de choisir pour de bonnes raisons, et de rester **cohérent**.

## Ce qui est pareil

Pour un type objet, tu peux faire presque tout avec les deux : signature d'index (`{ [key: string]: string }`), type de fonction (`type Fn = (x: number) => string` ou `interface Fn { (x: number): string }`), paramètres génériques, `implements` dans une classe, et `extends` croisé : une interface peut étendre un `type` objet et inversement. Les messages d'erreur sont pratiquement identiques.

## Ce qui diffère

### 1. Les unions, tuples et types calculés n'existent qu'avec `type`

```ts
type AorB = 'a' | 'b';                    // une interface ne peut pas faire ça
type Pair = [number, number];             // idem pour les tuples
type Keys = keyof State;                  // idem pour les types calculés
```

Une interface peut étendre un type objet, jamais une union. Pour une union, il faut `type`.

### 2. `extends` vérifie, `&` non

```ts
interface Person { name: string; age: number }

interface Student extends Person {
  age: string;   // erreur : Interface 'Student' incorrectly extends 'Person'
}

type Student2 = Person & { age: string };   // aucune erreur : age devient never
```

L'interface t'avertit tout de suite d'une redéclaration incompatible. L'intersection, elle, produit un type étrange (`age: number & string`, soit `never`) sans rien dire. Avantage `interface` pour les hiérarchies.

### 3. Seules les interfaces fusionnent

Deux déclarations du même nom s'additionnent :

```ts
interface Window { appVersion: string }
interface Window { userId: number }
// Window a maintenant appVersion ET userId
```

C'est ainsi que les bibliothèques ajoutent des membres aux types globaux, et que `lib.es5.d.ts` et `lib.es2015.d.ts` complètent `Array`. Pour un type d'API publique, cela permet aux utilisateurs de l'**augmenter** ; pour un type interne, c'est rarement voulu, et deux interfaces de même nom par accident se fusionnent en silence. Avec `type`, un doublon est une erreur.

### 4. Affichage dans les types générés

Un alias de type est parfois **remplacé par sa définition** dans les fichiers `.d.ts` générés et dans les messages ; une interface garde son nom. Pour un type nommé que les utilisateurs voient, l'interface produit des messages plus lisibles.

## Que choisir ?

- Une **union**, un **tuple** ou un type calculé : `type`.
- Un objet qui existe déjà dans la base : **la convention du projet**, par cohérence.
- Un **nouvel** objet : le guide officiel recommande `interface` (erreurs d'extension vérifiées, messages lisibles). Si le type pourrait être augmenté par des utilisateurs, `interface` est aussi la seule option.
- Et, quoi qu'il arrive : **sois cohérent** dans la base de code.

## Pièges fréquents

- **Utiliser `&` pour « étendre »** en croyant que l'incompatibilité sera signalée.
- **Deux interfaces homonymes dans un même projet** par hasard : elles fusionnent sans erreur.
- **Tenter `interface X = A | B`** : n'existe pas ; c'est `type`.

## À retenir

- type et interface sont très proches pour les objets ; la cohérence compte plus que le choix.
- `type` seul sait faire des unions, des tuples et des types calculés.
- `interface extends` vérifie la compatibilité ; `&` non.
- Seules les interfaces fusionnent, ce qui permet l'augmentation.
