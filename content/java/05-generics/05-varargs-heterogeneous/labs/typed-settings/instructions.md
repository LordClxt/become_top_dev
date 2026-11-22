## Contexte

Les réglages d'Ordo sont rangés par `Settings`, avec des clés typées `Key<T>` (fournies) : `Key.of("alert.threshold", Double.class)`. Mais l'intérieur est une `Map<String, Object>` indexée par le **nom** seul, avec des casts non vérifiés. Incident de la semaine : un module a rangé le seuil d'alerte sous une clé `String` du même nom (`"0.95"`), un autre l'a lu avec la clé `Double`, et le service a planté au premier dépassement, sur une ligne sans cast.

## Ta mission

1. Chaque réglage garde son type : `get(key)` renvoie un `Optional<T>`, `require(key)` un `T`, sans cast chez l'appelant.
2. Deux clés de même nom mais de types différents sont deux réglages distincts : lire l'une ne renvoie jamais la valeur de l'autre.
3. Une valeur du mauvais type, glissée par un type brut, est refusée **dès `put`** (`ClassCastException`), et rien n'est rangé.
4. `require` d'un réglage absent lève `NoSuchElementException` dont le message contient le nom de la clé.
5. `Settings.java` compile avec `-Xlint:all -Werror`, sans `@SuppressWarnings`.

Ne modifie que `Settings.java`.
