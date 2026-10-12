## Contexte

Deux idées font fonctionner les closures dans Grails : elles **retiennent des variables** (leur état) et on peut **rediriger** leurs appels vers un autre objet (leur delegate). Tu vas écrire les trois outils de base de Minigrails qui s'appuient dessus. Fichier à éditer : `Scope.groovy`.

## 1. `accumulator(Number start)`

Renvoie une closure qui reçoit un nombre `n`, l'ajoute à un total et renvoie ce total. Le total démarre à `start`. Chaque accumulateur a **son propre** total.

```groovy
def acc = Scope.accumulator(10)
acc(5)   // 15
acc(1)   // 16
```

## 2. `counters()`

Renvoie une map avec deux closures, `inc` et `value`, qui partagent **le même compteur** (démarré à 0). `inc()` l'augmente de 1 et renvoie la nouvelle valeur ; `value()` le lit. Deux appels de `counters()` donnent deux compteurs indépendants.

## 3. `runWith(Object target, Closure c)`

Exécute `c` en faisant de `target` son **delegate**, avec la priorité au delegate, et renvoie le résultat. C'est le `with` des DSL.

```groovy
Scope.runWith([a: 1, b: 2]) { a + b }                       // 3
Scope.runWith(new Greeter(name: 'Ada')) { greet() }         // "salut Ada"
```

Un test fournit une closure dont l'**owner** a aussi une propriété `name` : le delegate doit gagner.
