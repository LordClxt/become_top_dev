---
id: ts-ch09-l01
title: "Écrire des tests pour ses types"
source: { chapter: 6, pages: "240-248" }
duration_min: 35
concepts:
  - id: ts-assignability-not-equality
    label: "Tester par assignation (const x: T = f()) ne vérifie que l'assignabilité : un type trop précis ou une fonction à moins de paramètres passent"
  - id: ts-equals-expect
    label: "Le test d'égalité des Type Challenges (Equals<X, Y> avec des fonctions génériques) distingue any, unknown, readonly et les optionnels ; Expect<T extends true> le rend exécutable par tsc"
  - id: ts-negative-type-tests
    label: "@ts-expect-error écrit des tests négatifs (ce code doit être refusé) ; c'est un instrument grossier : une ligne par erreur attendue"
  - id: ts-type-test-tools
    label: "Des outils (expect-type, vitest expectTypeOf, tsd, eslint-plugin-expect-type) offrent des assertions de types toutes faites"
glossary:
  - term: "test de types"
    definition: "Code vérifié uniquement par le compilateur : il échoue si un type n'est pas celui attendu (rien ne s'exécute)."
  - term: "Equals<X, Y>"
    definition: "Type qui vaut true si X et Y sont identiques pour le vérificateur ; l'astuce compare deux fonctions génériques <T>() => T extends X ? 1 : 2."
visuals: []
labs: [ts-ch09-l01-lab-type-test-kit]
extra: false
xp: 35
---

## Pourquoi c'est important

Les types complexes (ceux des modules 06 à 08) sont du **code** : ils ont des bugs et des régressions. Les tester est aussi important que tester l'exécution. Mais les approches naïves vérifient beaucoup moins qu'on ne le croit.

## Le concept

### Les tests naïfs

```ts
declare function map<U, V>(array: U[], fn: (u: U) => V): V[];

map(['2017', '2018'], (v) => Number(v));                    // vérifie seulement que l'appel compile
const lengths: number[] = map(['john', 'paul'], (n) => n.length);   // vérifie l'assignabilité
```

Le second test passe si `map` renvoie `number[]`… mais aussi s'il renvoie `1[]` ou `never[]` : tout type assignable à `number[]`. De même, une fonction qui prend **moins** de paramètres est assignable à un type de fonction qui en prend plus. Une assignation ne teste pas l'**égalité**.

Autre piège : un module déclaré sans types (`declare module 'overbar';`) est `any`, et `any` passe tous les tests d'assignation.

### Tester l'égalité

La communauté des Type Challenges utilise :

```ts
export type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
export type Expect<T extends true> = T;

const lengths = map(['john', 'paul'], (n) => n.length);
type _t1 = Expect<Equals<typeof lengths, number[]>>;
```

L'astuce compare deux fonctions génériques : TypeScript ne les juge identiques que si `X` et `Y` le sont **exactement**, ce qui distingue `any` de `unknown`, `readonly` du reste, `{ a?: 1 }` de `{ a?: 1 | undefined }` (selon les options). `Expect<T extends true>` transforme un `false` en erreur de compilation. Ce sont les outils de tous les labs de ce cours (`tests/expect.ts`). Le livre recommande de **ne pas écrire ses propres outils** de tests de types : utilise cette approche éprouvée ou une bibliothèque (ci-dessous). Le lab te les fait réécrire uniquement pour comprendre comment ils marchent.

Limite : `Equals` est strict sur la **forme** : `{ a: 1 } & { b: 2 }` n'est pas égal à `{ a: 1; b: 2 }`, même s'ils sont équivalents (leçon suivante).

### Les tests négatifs

```ts
// @ts-expect-error la fonction ne doit pas accepter de chaîne
map([1, 2], 'not a function');
```

Si l'appel compile, la directive inutilisée est une erreur : c'est un test qui vérifie qu'un code **est refusé**. Instrument grossier : il ne dit pas **quelle** erreur ; mets une seule erreur attendue par ligne.

### Tester `this` et les callbacks

Une fonction qui prend un callback doit tester les types **inférés** de ses paramètres, et le type de `this` s'il fait partie de l'API (comme dans les fonctions de Lodash ou de jQuery). Pour vérifier les types que reçoit un callback, assigne ses paramètres :

```ts
map(beatles, function (name, i, array) {
  type _p = [Expect<Equals<typeof name, string>>, Expect<Equals<typeof i, number>>];
  return name.length;
});
```

### Les outils

Pour les déclarations publiées sur DefinitelyTyped, l'outil est `dtslint`. Pour ton propre code : `expect-type` et `expectTypeOf` de vitest (`expectTypeOf(x).toEqualTypeOf<number[]>()`), `tsd`, ou `eslint-plugin-expect-type` (commentaires `// ^? number[]`, comme les exemples du livre) offrent des assertions toutes faites et de meilleurs messages.

## Pièges fréquents

- **Tester par assignation** : un type trop précis ou `any` passe.
- **Oublier les tests négatifs** : un type trop permissif passe tous les tests positifs.
- **Plusieurs erreurs sous un seul `@ts-expect-error`** : la directive est satisfaite par la première.

## À retenir

- Teste l'égalité des types (`Expect<Equals<…>>`), pas l'assignabilité.
- Ajoute des tests négatifs avec `@ts-expect-error`, une erreur par ligne.
- Méfie-toi de `any` : il passe tout test naïf.
- Teste aussi les paramètres des callbacks et `this` ; utilise des outils standard plutôt que les tiens.
