---
id: grails-ch01-l03
title: "Fabriquer des closures : curry, composition, memoïsation"
source: { book: groovy-in-action, chapter: 5, pages: "130-133" }
duration_min: 25
concepts:
  - id: grails-closure-curry
    label: "curry : fixer des paramètres pour dériver une closure plus simple"
  - id: grails-closure-compose
    label: "Composer des closures avec >> et <<"
  - id: grails-closure-memoize
    label: "memoize et trampoline pour les calculs coûteux ou récursifs"
glossary:
  - term: "curry"
    definition: "Dérive une nouvelle closure en fixant les premiers paramètres d'une closure existante. rcurry fixe les derniers, ncurry le n-ième."
  - term: "composition"
    definition: "f >> g est la closure qui applique f puis g ; f << g applique g puis f."
  - term: "memoize"
    definition: "Renvoie une closure qui mémorise ses résultats : un même argument n'est calculé qu'une fois."
  - term: "trampoline"
    definition: "Technique qui transforme une récursion terminale de closure en boucle pour éviter le débordement de pile."
visuals: []
labs: [grails-ch01-l03-lab-functional]
extra: false
xp: 25
---

## Pourquoi c'est important

Tu sais déclarer, capturer et rediriger. Il reste à **fabriquer** des closures à partir d'autres closures. C'est ce qui permet d'écrire, par exemple, un pipeline de traitement de requêtes (un *middleware*) sans classe, ni interface, ni héritage.

## `curry` : fixer des paramètres

```groovy
def mult     = { x, y -> x * y }
def twoTimes = mult.curry(2)       // x vaut désormais 2
assert twoTimes(5) == 10
```

`curry` renvoie une **copie** de la closure avec les premiers paramètres déjà remplis. `rcurry` fixe les derniers, `ncurry(n, valeur)` fixe le n-ième.

Intérêt réel : une fonction **générique** à laquelle on injecte des comportements.

```groovy
def configurator = { format, filter, line -> filter(line) ? format(line) : null }
def appender     = { config, append, line ->
    def out = config(line)
    if (out) append(out)
}

def stamp   = { line -> "${new Date()}: $line" }
def isDebug = { line -> line.contains('debug') }
def toConsole = { line -> println line }

def myConf = configurator.curry(stamp, isDebug)
def myLog  = appender.curry(myConf, toConsole)

myLog('un message debug')       // affiché
myLog('un message normal')      // ignoré
```

Le filtrage est rapide, le formatage et l'affichage sont coûteux : le schéma ne les appelle que pour les lignes retenues. Chaque closure règle **un seul** souci (couplage minimal).

## Composer : `>>` et `<<`

```groovy
def plusOne  = { it + 1 }
def timesTwo = { it * 2 }

def a = plusOne >> timesTwo     // plusOne d'abord, puis timesTwo
def b = plusOne << timesTwo     // timesTwo d'abord, puis plusOne

assert a(3) == 8                // (3 + 1) * 2
assert b(3) == 7                // (3 * 2) + 1
```

La flèche indique le sens de circulation de la donnée. On retrouve ce schéma dans les chaînes de filtres et d'intercepteurs (module « AOP »).

## `memoize` : ne calculer qu'une fois

```groovy
def fib
fib = { it < 2 ? 1 : fib(it - 1) + fib(it - 2) }
fib = fib.memoize()
assert fib(40) == 165_580_141
```

Sans `memoize`, ce calcul exponentiel prend plusieurs secondes ; avec, il est instantané. `memoizeAtMost(n)` plafonne la taille du cache (éviction LRU). **À réserver aux closures pures** (même arguments, même résultat, sans effet de bord).

## `trampoline` : récursion sans débordement de pile

La JVM n'optimise pas la récursion terminale. Pour une closure récursive, `trampoline` remplace les appels imbriqués par une boucle :

```groovy
def sum
sum = { long n, long acc = 0 -> n == 0 ? acc : sum.trampoline(n - 1, acc + n) }
sum = sum.trampoline()
assert sum(100_000) == 5_000_050_000L
```

Sans `trampoline`, ce calcul se termine par un `StackOverflowError`. L'appel récursif doit être en **position terminale** (le dernier geste de la closure).

## Pièges fréquents

- **`curry` n'appelle pas la closure.** Il en fabrique une nouvelle.
- **Sens de `>>` et `<<`** : lis la flèche comme le sens de passage de la donnée.
- **`memoize` sur une closure impure** fige un effet de bord : un `println` n'apparaîtra qu'à la première évaluation.
- **`trampoline` exige une récursion terminale.** `n * fact(n - 1)` ne l'est pas.

## À retenir

- `curry`/`rcurry`/`ncurry` dérivent une closure en figeant des paramètres.
- `f >> g` : f puis g ; `f << g` : g puis f.
- `memoize` met en cache, à réserver aux closures pures ; `trampoline` évite le débordement de pile.

> **Source :** *Groovy in Action*, 2e éd., chapitre 5, section 5.4.2.
