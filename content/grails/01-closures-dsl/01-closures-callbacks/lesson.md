---
id: grails-ch01-l01
title: "Closures : déclarer, appeler, passer"
source: { book: groovy-in-action, chapter: 5, pages: "117-129" }
duration_min: 25
concepts:
  - id: grails-closure-object
    label: "Une closure est un objet qu'on déclare, stocke, passe et appelle"
  - id: grails-closure-arity
    label: "Le nombre de paramètres d'une closure (it, valeurs par défaut, arité)"
  - id: grails-closure-resource-protocol
    label: "Le protocole de ressource : la méthode ouvre et ferme, la closure travaille"
  - id: grails-closure-return
    label: "return dans une closure ne quitte que la closure"
glossary:
  - term: "closure"
    definition: "Bloc de code entre accolades, traité comme un objet : on peut le ranger dans une variable, le passer à une méthode, le renvoyer et l'appeler plus tard."
  - term: "it"
    definition: "Nom implicite du paramètre unique d'une closure qui n'en déclare aucun."
  - term: "référence de méthode"
    definition: "Écriture obj.&methode : transforme une méthode existante en closure, liée à l'objet obj."
  - term: "arité"
    definition: "Nombre de paramètres qu'accepte une closure ; Closure.getMaximumNumberOfParameters() le donne."
visuals: []
labs: [grails-ch01-l01-lab-callbacks]
extra: false
xp: 25
---

## Pourquoi c'est important

Ouvre n'importe quel fichier Grails : `static constraints = { … }`, `static mapping = { … }`, `def init = { servletContext -> … }` dans `BootStrap.groovy`, `list.each { … }`, `withTransaction { … }`. **Des closures partout.** Si tu les lis comme de la magie, tu seras perdu dès qu'un framework se comporte de façon inattendue. Si tu sais ce qu'elles sont (un objet, rien de plus), tu peux prédire ce que fait ton code.

Dans ce module, tu vas partir de la closure la plus simple et arriver, quatre leçons plus tard, au mécanisme qui fait fonctionner les DSL de Grails.

## Une closure est un objet

Une closure est **un morceau de code emballé dans un objet**. Elle peut prendre des paramètres et renvoyer une valeur, comme une méthode, mais on peut en plus la mettre dans une variable, la passer à une méthode ou la renvoyer.

```groovy
def doubler = { n -> n * 2 }      // déclarée, PAS exécutée
assert doubler(21) == 42          // appelée
assert doubler.call(5) == 10      // même chose, écriture longue
```

> Quand tu vois des accolades de closure, pense `new Closure() {…}`. Une closure est toujours une instance de `groovy.lang.Closure`.

Pour la JVM, il n'y a rien d'exotique : c'est un objet comme un autre. Groovy t'offre seulement une syntaxe très courte pour le fabriquer.

### Trois façons de déclarer une closure

```groovy
// 1. Abrégée : directement en dernier argument d'une méthode
[1, 2, 3].each { println it }

// 2. Par affectation : on la range d'abord dans une variable
def printer = { line -> println line }
[1, 2, 3].each(printer)

// 3. Par référence de méthode : on réutilise une méthode existante
class SizeFilter {
    int limit
    boolean sizeUpTo(String s) { s.size() <= limit }
}
def filter5 = new SizeFilter(limit: 5)
assert ['long string', 'short'].find(filter5.&sizeUpTo) == 'short'
```

Les trois sont **équivalentes** : `list.each { … }` est juste `list.each({ … })` sans les parenthèses, parce qu'une closure passée en **dernier argument** peut sortir des parenthèses. C'est pour ça qu'on place la closure en dernier dans les signatures de nos propres méthodes.

## Appeler une closure et lui passer des paramètres

```groovy
def adder = { x, y = 5 -> x + y }   // y a une valeur par défaut
assert adder(4, 3) == 7
assert adder(7) == 12
```

Trois cas pour les paramètres :

| Déclaration | Paramètres reçus |
|---|---|
| `{ println it }` | un seul, nommé `it` |
| `{ -> println 'hop' }` | aucun (la flèche seule interdit `it`) |
| `{ a, b -> a + b }` | ceux que tu nommes, avec types et valeurs par défaut possibles |

### Une méthode peut s'adapter à la closure qu'on lui donne

`Map.each` accepte deux styles :

```groovy
def m = [a: 1, b: 2]
m.each { entry -> println entry.key }   // un paramètre : l'entrée
m.each { k, v -> println "$k=$v" }      // deux paramètres : clé et valeur
```

Ce n'est pas de la magie. La méthode **interroge la closure** avec `getMaximumNumberOfParameters()` (et `getParameterTypes()` pour les types), puis choisit comment l'appeler. Tu vas écrire exactement ça dans le lab.

## Le protocole de ressource

Combien de fois as-tu vu un `close()` oublié, ou placé hors du `finally` ? Le problème est que **le code qui ouvre** et **le code qui utilise** sont mélangés. Avec une closure, on les sépare :

```groovy
new File('data.txt').eachLine { println it }
```

`eachLine` ouvre le fichier, appelle ta closure pour chaque ligne, puis ferme le fichier, **même si ta closure lève une exception**. Le « protocole » (ouvrir, utiliser, fermer) est écrit **une seule fois**, et testé une seule fois.

```groovy
static Object withResource(List log, Closure work) {
    log << 'open'
    try {
        return work(log)
    } finally {
        log << 'close'
    }
}
```

C'est le schéma derrière `withTransaction { … }`, `withSession { … }` et `withNewSession { … }` de GORM : la méthode gère la transaction ou la session, **ta closure fait le travail**.

## `return` dans une closure

```groovy
[1, 2, 3].each { if (it == 2) return; println it }   // affiche 1 puis 3 !
```

Dans une closure, `return` termine **cette exécution de la closure**, pas la méthode englobante, et pas `each`. Le `each` rappelle simplement la closure avec l'élément suivant. Pour sortir d'une boucle de façon anticipée :

- utilise un `for … in` avec `return` ou `break` (le corps d'un `for` n'est **pas** une closure) ;
- ou une méthode faite pour s'arrêter : `find`, `any`, `every`.

## Pièges fréquents

- **Une closure déclarée n'est pas appelée.** `def x = { println 'hi' }` ne fait rien du tout ; il faut `x()`.
- **`each` n'est pas un `for`.** Pas de `break`, et `return` ne sort que de la closure.
- **Une closure publique dans un service Grails n'est pas transactionnelle.** Le proxy Spring ne voit que les *méthodes* ; une closure est un champ public, ignoré. (Même raison pour laquelle on préfère des méthodes aux closures pour les actions de contrôleur.) Tu retrouveras ce piège au module 8.
- **Les types des paramètres de closure sont vérifiés à l'exécution**, pas à la compilation.

## À retenir

- Une closure est un objet : on la **déclare**, on la **range**, on la **passe**, on l'**appelle** (`c()` ou `c.call()`).
- La closure en **dernier argument** sort des parenthèses.
- Une méthode peut lire l'**arité** de sa closure pour s'adapter (`Map.each`).
- Le **protocole de ressource** met l'ouverture/fermeture dans la méthode, le travail dans la closure.
- `return` dans une closure ne quitte que la closure.

> **Source :** *Groovy in Action*, 2e éd., chapitre 5, sections 5.1 à 5.4.1 ; *Programming Grails*, chapitre 1, « Closures » et « Closures Versus Methods ».
