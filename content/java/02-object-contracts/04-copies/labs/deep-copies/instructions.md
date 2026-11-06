## Contexte

Trois classes d'un outil de planification doivent pouvoir être copiées pour simuler des scénarios « et si… ». Aujourd'hui, modifier la copie modifie l'original.

## 1. `Stack` (déjà `Cloneable`)

Son `clone()` se contente de `super.clone()`. Répare-le : la copie doit avoir **son propre** tableau. Garde la signature `public Stack clone()`, sans `throws`.

## 2. `ChainedMap` (déjà `Cloneable`)

Une table de hachage maison : 16 compartiments, chacun en tête d'une liste chaînée d'`Entry` dont la **valeur est modifiable** (`put` sur une clé existante remplace la valeur). Son `clone()` copie le tableau de compartiments… mais pas les chaînes.

Écris une copie **profonde** : aucune `Entry` partagée entre la copie et l'original. Les clés sont des `int` et les valeurs des `String` (immuables) : pas besoin de les copier elles-mêmes.

Contrainte : une chaîne peut être très longue (un mauvais hash, et tout tombe dans le même compartiment). Ta copie doit fonctionner **même avec une petite pile** : les tests clonent une chaîne de 5 000 entrées dans un thread de 64 Kio de pile.

## 3. `Schedule` (pas `Cloneable`, et ça doit le rester)

Un planning : une équipe et, pour chaque jour, la liste des personnes affectées. Ajoute :

- un **constructeur de copie** `Schedule(Schedule other)` : la copie est indépendante, y compris ses listes ;
- une **fabrique de conversion** `Schedule.from(String team, Map<DayOfWeek, ? extends Collection<String>> shifts)` qui accepte n'importe quelle `Map` de n'importe quelles collections (`Set`, `List`…), sans garder de référence vers elles.

Les champs de `Schedule` restent `final`.
