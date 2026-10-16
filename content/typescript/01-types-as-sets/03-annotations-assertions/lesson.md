---
id: ts-ch01-l03
title: "Annotations plutôt qu'assertions, et pas de types enveloppes"
source: { chapter: 2, pages: "45-52" }
duration_min: 25
concepts:
  - id: ts-annotation-vs-assertion
    label: "Une annotation (: T) fait vérifier la valeur ; une assertion (as T) fait taire le vérificateur"
  - id: ts-assertion-comparable
    label: "as n'accepte que des types « comparables » (qui se recouvrent) ; as unknown as T force tout, à éviter"
  - id: ts-non-null-assertion
    label: "L'assertion de non-nullité ! est une promesse qui peut mentir ; à justifier par un commentaire ou une vérification"
  - id: ts-as-const
    label: "as const fige un littéral au type le plus étroit, sans rien contourner"
  - id: ts-wrapper-types
    label: "String, Number, Boolean… (majuscule) sont des types enveloppes : utiliser string, number, boolean"
glossary:
  - term: "assertion de type"
    definition: "`valeur as T` : tu affirmes un type au vérificateur. Aucune vérification ni conversion à l'exécution."
  - term: "type enveloppe (wrapper)"
    definition: "Les objets String, Number, Boolean, Symbol, BigInt, distincts des primitifs en minuscules."
visuals: []
labs: [ts-ch01-l03-lab-annotations]
extra: false
xp: 25
---

## Pourquoi c'est important

Deux écritures donnent un type à une valeur, et elles ne font **pas du tout** la même chose :

```ts
interface Person { name: string }

const alice: Person = { name: 'Alice' };        // annotation : TypeScript VÉRIFIE
const bob = { name: 'Bob' } as Person;          // assertion : TypeScript te CROIT
```

Sur ces exemples, le résultat est identique. Mais sur un objet erroné, l'annotation proteste et l'assertion se tait :

```ts
const a: Person = {};              // erreur : name manque
const b = {} as Person;            // aucune erreur
const c: Person = { name: 'x', age: 3 };   // erreur : propriété en trop
const d = { name: 'x', age: 3 } as Person; // aucune erreur
```

L'assertion supprime donc à la fois la vérification de **complétude** et celle des **propriétés en trop**.

## Le concept

### Annoter, y compris pour le retour d'une `map`

Pour construire un tableau de `Person`, ne force pas :

```ts
const people = ['alice', 'bob'].map(name => ({ name } as Person));   // masque les oublis
const people2 = ['alice', 'bob'].map((name): Person => ({ name }));   // le retour est vérifié
```

La deuxième écriture déclare le type de **retour** de la flèche : toute propriété oubliée ou fautive est signalée. Quand une variable est déjà déclarée, `const people: Person[] = names.map(name => ({ name }))` convient aussi.

### Quand l'assertion est légitime

Quand tu sais quelque chose que TypeScript ne peut pas savoir, typiquement le DOM :

```ts
document.querySelector('#myButton')!.addEventListener('click', e => {
  const button = e.currentTarget as HTMLButtonElement;   // l'événement est enregistré sur un bouton
});
```

Tu sais que c'est un bouton, le vérificateur non. Même alors, laisse un commentaire qui dit pourquoi. Le suffixe `!` (« non-null ») suit la même logique : `elem!` promet que ce n'est ni `null` ni `undefined`. Si tu te trompes, c'est une erreur d'exécution.

Une assertion n'est permise qu'entre types **comparables** :

```ts
const body = document.body;
const el = body as Person;                // erreur : HTMLElement et Person n'ont rien en commun
const el2 = body as unknown as Person;    // passe : un détour par unknown force tout
```

`as unknown as T` est l'ultime échappatoire : chaque occurrence mérite une justification.

`as const` n'est pas une assertion dangereuse : elle demande au compilateur le type **le plus étroit** (`as const` sur `{ name: 'x' }` donne `{ readonly name: 'x' }`) sans contourner aucune vérification.

### Les types enveloppes

JavaScript possède des objets `String`, `Number`, `Boolean`, `Symbol` et `BigInt`, créés par `new String('x')`. Ce sont des objets, pas des primitifs : `'x' === new String('x')` est faux. TypeScript les modélise par des types à majuscule, distincts de `string`, `number`…

```ts
function isGreeting(phrase: String) {
  return ['hello', 'hola'].includes(phrase);   // erreur : String n'est pas assignable à string
}
```

Une `string` est assignable à `String` (pour appeler `.charAt`, JavaScript l'enveloppe temporairement), mais pas l'inverse. **Utilise toujours les minuscules**.

## Pièges fréquents

- **`{} as Person`** pour « avancer » : tu fabriques un objet invalide que le type certifie.
- **`as` pour convertir** : rien n'est converti (leçon 3 du module 00).
- **`!` partout** : chaque `!` est un crash potentiel que tu as signé.
- **`String`, `Number`** dans une signature : tu acceptes des objets que personne n'utilise, et tu refuses les vraies chaînes dans certains cas.

## À retenir

- Préfère une annotation à une assertion : elle fait vérifier la valeur, y compris les propriétés en trop.
- Annote le retour d'une flèche (`(n): T => …`) plutôt que d'asserter le résultat.
- Une assertion se justifie quand tu en sais plus que le vérificateur (le DOM) ; commente-la.
- `as unknown as T` et `!` sont des dettes ; `as const` n'en est pas une.
- Écris `string`, `number`, `boolean` : jamais `String`, `Number`, `Boolean`.
