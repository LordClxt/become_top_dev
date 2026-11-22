## Hint 1
La clé porte le type. Qu'est-ce qui identifie vraiment un réglage : son nom, ou sa clé entière (nom + type) ? Un `record` a déjà `equals` et `hashCode`.

## Hint 2
Indexe la map par `Key<?>`. Pour rétablir le type sans avertissement, `Class.cast` fait un cast **vérifié** : `key.type().cast(objet)`. Utilise-le aussi à l'entrée, pour arrêter un client qui passerait par un type brut.

## Hint 3
`Map<Key<?>, Object> values` ; `put` : `values.put(key, key.type().cast(value))` ; `get` : `Optional.ofNullable(key.type().cast(values.get(key)))` ; `require` : `get(key).orElseThrow(() -> new NoSuchElementException("réglage manquant : " + key.name()))`.
