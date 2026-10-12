---
id: grails-ch00-l04
title: "Vérité Groovy, switch et opérateurs"
source: { book: groovy-in-action, chapter: 6, pages: "145-163" }
duration_min: 25
concepts:
  - id: grails-groovy-truth
    label: "La vérité Groovy : ce qui est vrai ou faux dans un if"
  - id: grails-groovy-safe-nav
    label: "?. et ?: pour écrire des chaînes d'accès sans null-check"
  - id: grails-groovy-switch-iscase
    label: "switch, in et grep reposent sur la méthode isCase"
  - id: grails-groovy-operator-overloading
    label: "Chaque opérateur est un appel de méthode que l'on peut définir"
glossary:
  - term: "vérité Groovy"
    definition: "Règles qui transforment n'importe quel objet en booléen : null, 0, chaîne vide, collection vide sont faux."
  - term: "Elvis"
    definition: "Opérateur ?: : a ?: b renvoie a s'il est vrai (au sens Groovy), sinon b."
  - term: "isCase"
    definition: "Méthode appelée par switch, in et grep : classificateur.isCase(valeur) dit si la valeur appartient à la catégorie."
  - term: "asBoolean"
    definition: "Méthode qu'une classe peut définir pour décider de sa propre vérité Groovy."
visuals: []
labs: [grails-ch00-l04-lab-ops]
extra: false
xp: 25
---

## Pourquoi c'est important

Dans une action de contrôleur Grails, tu écris `if (!book)`, `params.max ?: 10`, `book?.author?.name`. Chaque ligne repose sur une règle que Java n'a pas : la **vérité Groovy**. La connaître évite deux bugs classiques : un `0` qui passe pour « absent », et un `null` qui explose trois appels plus loin.

## La vérité Groovy

N'importe quel objet peut servir de condition :

| Valeur | Vrai quand… |
|---|---|
| `Boolean` | `true` |
| `null` | jamais |
| `String` / `GString` | non vide |
| `Collection` / `Map` | non vide |
| `Number` | différent de zéro |
| `Matcher` | il a trouvé quelque chose |
| tout autre objet | non `null` |

```groovy
assert 'a' && [1] && 3 && new Object()
assert !('' || [] || [:] || 0 || null)
```

Une classe peut décider elle-même : si elle déclare `boolean asBoolean()`, `if (obj)` l'appelle. C'est ce que fait le `Money` du lab (`false` à zéro).

### Le piège : zéro et vide sont « faux »

```groovy
def max = params.max ?: 10      // si l'utilisateur demande max=0, tu obtiens 10 !
```

Quand `0` ou `''` sont des valeurs légitimes, teste explicitement : `params.max != null`, ou `x == null`.

Autre limite : **l'affectation dans un `if` de premier niveau est interdite** (`if (x = 5)` ne compile pas, c'est presque toujours une faute de frappe). Elle reste permise dans un `while`.

## `?:` et `?.`

```groovy
def name = user.nickname ?: user.login        // Elvis : défaut si faux
def city = person?.address?.city              // ?. : null au lieu de NullPointerException
def label = person?.address?.city ?: 'inconnue'
```

`a?.b` vaut `null` si `a` est `null`, sans évaluer `b`. Combiné avec `?:`, il remplace des cascades de `if`. Depuis Groovy 3, l'affectation Elvis `a ?= b` n'affecte `b` que si `a` est faux. 

Dans les GSP et les contrôleurs de Grails, `?.` est partout, car les objets peuvent être absents (une recherche qui ne trouve rien renvoie `null`).

## switch : un classificateur par `case`

Le `switch` de Groovy n'est pas limité aux constantes. Chaque `case` appelle `isCase`, et son comportement dépend du type de la valeur du `case` :

| `case …` | Se lit |
|---|---|
| `Number` (une classe) | `x instanceof Number` |
| `1..9` (un range) | `x` dans le range |
| `[1, 2, 3]` (une collection) | `x` est un des éléments |
| `~/\d+/` (un Pattern) | la regex couvre toute la chaîne |
| `{ it > 5 }` (une closure) | la closure renvoie une valeur vraie |
| `'texte'` | égalité |

```groovy
def kind(x) {
    switch (x) {
        case null:        return 'rien'
        case 1..9:        return 'chiffre'
        case Number:      return 'nombre'
        case ~/\d+/:      return 'texte numérique'
        case [].class:    return 'liste'
        case { x.size() > 10 }: return 'long'
        default:          return 'autre'
    }
}
```

Le premier `case` qui correspond l'emporte, et il faut un `return` ou un `break` (sinon on « tombe » dans le suivant, comme en Java). **L'ordre est donc important** : mets les cas précis avant les cas généraux, comme tu le fais dans le lab.

Le même mécanisme sert à `grep` et à l'opérateur `in` :

```groovy
assert [1, 'a', 2.5, 'b'].grep(String) == ['a', 'b']
assert [3, 12, 7].grep(5..10) == [7]
assert 3 in [1, 2, 3]
```

Tout objet qui définit `isCase` devient un classificateur : c'est l'une des extensions les plus simples du langage.

## Les opérateurs sont des méthodes

```groovy
assert 1 + 2 == 1.plus(2)
assert [1, 2] << 3 == [1, 2].leftShift(3)
```

| Opérateur | Méthode | Opérateur | Méthode |
|---|---|---|---|
| `a + b` | `plus` | `a[i]` | `getAt` |
| `a - b` | `minus` | `a[i] = v` | `putAt` |
| `a * b` | `multiply` | `a << b` | `leftShift` |
| `a / b` | `div` | `-a` | `negative` |
| `a % b` | `mod` | `a++` | `next` |
| `a ** b` | `power` | `a == b` | `equals` / `compareTo` |
| `a <=> b` | `compareTo` | `a as T` | `asType` |

Il suffit de définir la méthode dans ta classe pour que l'opérateur marche :

```groovy
class Vec {
    int x, y
    Vec plus(Vec o) { new Vec(x: x + o.x, y: y + o.y) }
}
assert (new Vec(x: 1, y: 2) + new Vec(x: 3, y: 4)).y == 6
```

Règles de bon sens : renvoie un **nouvel** objet (une classe de valeur est idéalement immuable), garde le sens habituel de l'opérateur, et définis `equals`/`hashCode` en même temps que `compareTo` (`@EqualsAndHashCode`). Pour des types qui se mélangent (`Money * Number`), la méthode est choisie selon le type **à l'exécution** de l'argument (multiméthodes, module 02).

### Un opérateur qui trompe : `==`

En Groovy, `==` appelle `equals` (ou `compareTo` pour les `Comparable`), alors que `is()` compare l'identité. L'opérateur de Java `==` n'existe plus sous cette forme : `new String('a') == new String('a')` est vrai.

> **Grails 7.** Rien de ce chapitre n'a changé avec Groovy 4 (l'opérateur `?=` est une nouveauté de Groovy 3). Les chaînes d'accès `?.` restent ton outil principal face aux `null` que renvoient `Book.get(id)` et `findBy…` quand rien ne correspond.

## Pièges fréquents

- **`params.max ?: 10`** quand `0` est une valeur permise.
- **Un `case` trop général placé avant un cas précis** : `case Number` avant `case 1..9` masque le second.
- **Oublier `break`/`return`** dans un `switch` : le code continue dans le `case` suivant.
- **Redéfinir un opérateur avec un sens inattendu** : `a + b` qui modifie `a`.
- **`list.find { it }`** ignore les `0` et les chaînes vides, qui sont faux.

## À retenir

- Vérité Groovy : `null`, `0`, `''`, collection ou map vide sont faux ; `asBoolean()` personnalise.
- `?.` coupe la chaîne au premier `null` ; `?:` donne la valeur par défaut des valeurs « fausses ».
- `switch`, `in` et `grep` appellent `isCase` : classe, range, collection, regex, closure.
- Un opérateur est une méthode : `plus`, `minus`, `compareTo`… Définis-la, l'opérateur suit.

> **Sources :** *Groovy in Action*, 2e éd., chapitre 6 (« Working with Groovy control structures » : vérité Groovy, `switch` et `isCase`, assertions) et chapitre 3 (surcharge d'opérateurs) ; *Programming Grails*, chapitre 1 (idiomes Groovy dans Grails).
