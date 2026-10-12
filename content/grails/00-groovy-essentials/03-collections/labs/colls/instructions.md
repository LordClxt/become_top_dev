## Contexte

Un contrôleur Grails passe son temps à regrouper, indexer et trier des collections avant de les afficher. Tu écris cinq fonctions de **Minigrails** dans `Colls.groovy`, chacune en quelques lignes si tu utilises le GDK.

## 1. `wordFrequencies(String text)`

Compte les mots (`\w+`, **sans tenir compte de la casse**) et renvoie une `Map` mot → nombre, triée par nombre **décroissant** puis par mot **croissant**.

```groovy
Colls.wordFrequencies('b a B c a b')   // [b:3, a:2, c:1]
```

## 2. `groupByInitial(List<String> words)`

Regroupe les mots par initiale **en majuscule**. Chaque liste est triée alphabétiquement.

```groovy
Colls.groupByInitial(['banane', 'avocat', 'abricot'])
// [B:['banane'], A:['abricot', 'avocat']]
```

## 3. `indexBy(List<Map> rows, String key)`

Renvoie une map `valeur de la clé → ligne`. Si deux lignes ont la même valeur, la dernière gagne.

## 4. `flattenRanges(List<Range> ranges)`

Déplie des ranges d'entiers en une liste triée sans doublon : `[1..3, 2..5]` donne `[1, 2, 3, 4, 5]`. Un range inversé (`5..3`) est accepté.

## 5. `sortedCopy(List items)`

Renvoie une **copie triée** sans modifier la liste reçue. En Groovy, `sort()` modifie le receveur *et* le renvoie : c'est le piège que ce test traque.
