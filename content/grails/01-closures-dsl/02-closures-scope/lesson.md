---
id: grails-ch01-l02
title: "Portée : capture, owner et delegate"
source: { book: groovy-in-action, chapter: 5, pages: "134-141" }
duration_min: 30
concepts:
  - id: grails-closure-capture
    label: "Une closure capture les variables de son contexte par référence"
  - id: grails-closure-owner-delegate
    label: "this, owner et delegate : qui répond quand la closure appelle une méthode ou lit une propriété"
  - id: grails-closure-resolve-strategy
    label: "resolveStrategy : l'ordre dans lequel owner et delegate sont consultés"
glossary:
  - term: "capture"
    definition: "Une closure garde une référence (pas une copie) aux variables visibles là où elle a été déclarée."
  - term: "owner"
    definition: "L'objet (ou la closure) dans lequel la closure est déclarée. Il ne change jamais."
  - term: "delegate"
    definition: "Objet vers lequel la closure redirige les noms qu'elle ne résout pas elle-même. Par défaut c'est l'owner, mais on peut le remplacer."
  - term: "resolveStrategy"
    definition: "Règle qui fixe qui est consulté en premier : OWNER_FIRST (défaut), DELEGATE_FIRST, OWNER_ONLY, DELEGATE_ONLY, SELF_ONLY."
visuals: [grails-ch01-closure-scope]
labs: [grails-ch01-l02-lab-scope]
extra: false
xp: 30
---

## Pourquoi c'est important

À la leçon précédente, une closure n'était qu'un objet qu'on appelle. Mais regarde ce bloc de Grails :

```groovy
static mapping = {
    version false
    table 'users'
    password column: 'passwd'
}
```

`version`, `table` et `password` ne sont ni des variables ni des méthodes de `User`. Si tu appelles `User.mapping()` directement, Groovy lève une `MissingMethodException`. Pourtant, au démarrage, Grails exécute ce bloc et ça marche. **Il redirige les appels vers un autre objet.** C'est le rôle du `delegate`, et c'est la clé de tous les DSL de Grails.

## Les closures capturent leur contexte par référence

```groovy
def x = 0
10.times { x++ }
assert x == 10
```

La méthode `times` n'a aucun moyen de connaître `x`. C'est la closure qui s'en souvient : au moment où elle est **déclarée**, elle garde une **référence** (pas une copie) aux variables locales visibles. Elle peut donc les lire **et les modifier**, même quand elle est appelée très loin de là.

C'est ce que Java 8 interdit aux lambdas (« effectively final »). En Groovy, un compteur partagé tient en trois lignes :

```groovy
def foo(n) {
    return { n += it }      // `n` est le paramètre de foo, capturé
}
def acc = foo(1)
assert acc(2) == 3
assert acc(1) == 4          // l'état est dans la closure
```

Chaque appel à `foo` crée une closure **avec son propre `n`**.

## `this`, `owner`, `delegate`

Dans une closure, trois mots désignent trois choses :

| | C'est… | Peut changer ? |
|---|---|---|
| `this` | la **classe englobante** (l'instance de la classe où le code est écrit), *pas* la closure | non |
| `owner` | l'objet qui **contient** la closure : la classe, ou une autre closure si elles sont imbriquées | non |
| `delegate` | un objet **choisi par toi** vers lequel on redirige ; vaut l'`owner` par défaut | **oui** |

Quand le code d'une closure utilise un nom que la closure ne connaît pas (`woof()`, `name`…), Groovy cherche d'abord dans l'`owner`, puis dans le `delegate` (stratégie par défaut `OWNER_FIRST`).

```groovy
class Greeter {
    String name
    String greet() { "salut $name" }
}

def hello = { greet() }          // `greet` n'existe pas ici
hello.delegate = new Greeter(name: 'Ada')
hello.resolveStrategy = Closure.DELEGATE_FIRST
assert hello() == 'salut Ada'    // c'est le delegate qui répond
```

### `resolveStrategy` : qui est consulté en premier ?

| Stratégie | Ordre de recherche |
|---|---|
| `OWNER_FIRST` (défaut) | owner, puis delegate |
| `DELEGATE_FIRST` | delegate, puis owner |
| `OWNER_ONLY` / `DELEGATE_ONLY` | un seul des deux |
| `SELF_ONLY` | la closure elle-même |

Si l'owner et le delegate ont tous deux une propriété `name`, la stratégie décide laquelle gagne. Pour un DSL, on choisit presque toujours `DELEGATE_FIRST` : **le builder doit avoir la priorité**.

## `with` : un delegate en une ligne

Le GDK fournit déjà ce mécanisme :

```groovy
def map = [:]
map.with {         // le delegate est `map`
    a = 1          // équivaut à map.a = 1
    b = 2
}
assert map == [a: 1, b: 2]
```

Les builders, `static constraints` et `static mapping` de GORM sont ce même mécanisme, avec un objet *builder* à la place de `map` : Grails fixe le delegate d'une closure sur un `HibernateMappingBuilder` (cf. *Programming Grails*, ch. 1), exécute la closure, et chaque « appel de méthode » inconnu (`version false`) est reçu par le builder.

## Pièges fréquents

- **`this` n'est pas la closure.** Si tu écris `this.x` dans une closure, tu lis la classe englobante.
- **Mauvaise stratégie → mauvais objet.** Avec `OWNER_FIRST`, une propriété homonyme dans l'owner masque celle du delegate, sans erreur.
- **L'owner ne change jamais**, seul le `delegate` se remplace (ou la closure se reconstruit avec `rehydrate`).
- **Un `for` n'est pas une closure** : pas de capture, pas de delegate, pas de nouvelle portée.

## À retenir

- Une closure garde une **référence** aux variables de son contexte de déclaration.
- `this` = classe englobante ; `owner` = conteneur (fixe) ; `delegate` = redirection (modifiable).
- `resolveStrategy` fixe l'ordre owner/delegate ; les DSL utilisent `DELEGATE_FIRST`.
- `obj.with { … }` = « exécute cette closure avec `obj` pour delegate ».

> **Source :** *Groovy in Action*, 2e éd., chapitre 5, sections 5.5 et 5.6 ; *Programming Grails*, chapitre 1, « Owner, Delegate, and this ».
