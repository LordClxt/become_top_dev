---
id: ts-ch07-l05
title: "Les pièges d'unsoundness et la couverture de types"
source: { chapter: 5, pages: "202-214" }
duration_min: 35
concepts:
  - id: ts-soundness-definition
    label: "Un système est sound si le type statique contient toujours la valeur à l'exécution ; TypeScript ne l'est pas, par choix de praticité"
  - id: ts-index-unsoundness
    label: "xs[i] et obj[key] sont typés T même hors limites ; noUncheckedIndexedAccess ajoute | undefined"
  - id: ts-method-bivariance
    label: "Les paramètres des méthodes (syntaxe m(x): void) sont bivariants : une sous-classe peut restreindre un paramètre et planter ; la syntaxe propriété (m: (x) => void) est vérifiée strictement"
  - id: ts-array-variance
    label: "Un Hen[] est assignable à Animal[], et la fonction peut y pousser un Fox : un paramètre readonly Animal[] élimine le problème"
  - id: ts-refinement-invalidation
    label: "Un appel de fonction n'invalide pas un rétrécissement sur une propriété, même si la fonction la modifie : copier la valeur dans une const avant l'appel"
  - id: ts-type-coverage
    label: "Mesurer la part d'expressions non any (type-coverage) et la suivre en CI empêche les régressions de sécurité"
glossary:
  - term: "soundness (correction)"
    definition: "Propriété d'un système de types dont les types statiques sont toujours vrais à l'exécution."
  - term: "bivariance"
    definition: "Règle qui accepte un type de paramètre plus large OU plus étroit lors d'une affectation de fonction ; seule la contravariance est sûre."
visuals: []
labs: [ts-ch07-l05-lab-soundness]
extra: false
xp: 35
---

## Pourquoi c'est important

Un système de types est **sound** si, quand il dit qu'une variable est un `number`, elle en contient vraiment un à l'exécution. TypeScript ne l'est pas, délibérément : une soundness totale rendrait le langage pénible. Connaître ses trous te permet de les éviter là où ça compte.

## Le concept

### any et les assertions

Les deux sources évidentes : `any` (modules précédents) et les assertions (`hour as number`). Le reste est plus subtil.

### Les accès indexés

```ts
const xs = [0, 1, 2];
const x = xs[3];   // number… mais undefined
```

L'option `noUncheckedIndexedAccess` ajoute `| undefined` à `xs[i]` et `obj[key]` (avec signature d'index) : plus sûr, mais plus verbeux (même `xs[0]` après un test de longueur). À défaut, pense `xs.at(i)` ou un test explicite.

### La bivariance des méthodes

```ts
class Parent { foo(x: number | string) {} }
class Child extends Parent {
  foo(x: string) { x.toUpperCase(); }   // accepté !
}
const p: Parent = new Child();
p.foo(12);   // plante : x.toUpperCase is not a function
```

Restreindre un paramètre dans une sous-classe est dangereux (un `Parent` doit accepter `number`). Pour les **méthodes**, TypeScript tolère pourtant les deux sens (bivariance). Avec `strictFunctionTypes`, les **propriétés de type fonction** sont vérifiées correctement (contravariance des paramètres) :

```ts
interface Handler { handle: (x: number | string) => void }   // vérifié strictement
interface LaxHandler { handle(x: number | string): void }     // bivariant
```

### La variance des tableaux

```ts
function addFoxOrHen(animals: Animal[]) {
  animals.push(Math.random() > 0.5 ? new Fox() : new Hen());
}
const henhouse: Hen[] = [new Hen()];
addFoxOrHen(henhouse);   // accepté… un renard dans le poulailler
```

`Hen[]` est accepté comme `Animal[]` (covariance), alors que la fonction peut y écrire n'importe quel `Animal`. Solution : `readonly Animal[]` pour les fonctions qui lisent, et ne jamais muter un tableau reçu.

### Les raffinements non invalidés

```ts
function processFact(fact: FunFact, processor: (fact: FunFact) => void) {
  if (fact.author) {
    processor(fact);
    console.log(fact.author.blink());   // typé string… mais processor a pu supprimer author
  }
}
```

TypeScript ne suppose pas qu'un appel modifie les propriétés déjà testées (sinon chaque appel annulerait tous les rétrécissements). Parade : copier la valeur avant l'appel (`const { author } = fact`), et passer des objets `Readonly`.

### Optionnels et types ouverts

Un type « ouvert » (les objets ont pu avoir des propriétés en plus) peut cacher une propriété optionnelle d'un **autre** type : un `{ name, age: '42 ans' }` assigné à `{ name }` puis à `{ name; age?: number }` fait entrer une chaîne dans un `number | undefined`. Valide les propriétés optionnelles à l'exécution quand les données viennent de loin.

### La couverture de types

`npx type-coverage` compte les expressions dont le type n'est pas `any` (par exemple 98,7 %), et `--detail` les liste. Même avec `noImplicitAny`, des `any` entrent par des `any` explicites oubliés ou par des déclarations tierces (`@types`). Suivre ce chiffre en CI empêche les `any` (et les `any` venus de déclarations de modules comme `declare module 'x'`) de revenir en douce.

## Pièges fréquents

- **`xs[i]` supposé défini** : teste, ou active `noUncheckedIndexedAccess`.
- **Restreindre un paramètre de méthode dans une sous-classe** : bivariance silencieuse.
- **Muter un tableau reçu en paramètre** : `readonly` évite le renard.
- **Relire une propriété testée après un callback** : copie-la d'abord.

## À retenir

- TypeScript n'est pas sound : `any`, assertions, index, bivariance des méthodes, variance des tableaux, raffinements après appel.
- Parades : `noUncheckedIndexedAccess`, syntaxe propriété pour les fonctions, `readonly`, copies locales.
- Mesure et suis ta couverture de types.
