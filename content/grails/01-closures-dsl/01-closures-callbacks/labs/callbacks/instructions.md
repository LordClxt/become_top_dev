## Contexte

Tu construis les premières briques de **Minigrails**, le mini-framework du cours. Avant de pouvoir écrire un DSL, il faut maîtriser trois mécanismes que les frameworks utilisent partout : s'adapter à la closure reçue, entourer un travail d'un protocole, et sortir d'une itération au bon moment.

Tu édites `Callbacks.groovy`. Trois méthodes statiques sont à écrire.

## 1. `collectAdaptive(Map map, Closure c)`

Reproduit l'astuce de `Map.each` :

- si `c` déclare **un seul** paramètre (y compris le `it` implicite), appelle-la avec l'**entrée** (`Map.Entry`) ;
- si `c` en déclare **deux ou plus**, appelle-la avec `(clé, valeur)`.

Renvoie la liste des résultats, dans l'ordre de la map.

```groovy
Callbacks.collectAdaptive([a: 1, b: 2]) { e -> e.key + e.value }   // ['a1', 'b2']
Callbacks.collectAdaptive([a: 1, b: 2]) { k, v -> k * v }          // ['a', 'bb']
```

## 2. `withResource(List log, Closure c)`

Ajoute `'open'` dans `log`, appelle `c(log)`, puis ajoute `'close'` **quoi qu'il arrive**. Si la closure lève une exception, elle est relancée après la fermeture. Renvoie le résultat de la closure.

## 3. `firstOver(Iterable items, Number limit)`

Renvoie le premier élément strictement supérieur à `limit`, ou `null`. La méthode doit **s'arrêter dès qu'elle l'a trouvé** : un test compte combien d'éléments ont été lus.

## Lancer les tests

Utilise le bouton « Lancer les tests ». Un `assert` qui échoue affiche l'arbre de ses sous-expressions : lis-le, il te dit quelle valeur n'est pas celle que tu croyais.
