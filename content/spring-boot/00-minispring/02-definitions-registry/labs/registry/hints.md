## Hint 1
Deux `Map` : les définitions par nom (`LinkedHashMap`, pour garder l'ordre) et les singletons déjà créés par nom. `register` ne remplit que la première.

## Hint 2
Fais converger `getBean(String)` et `getBean(Class)` vers une seule méthode qui reçoit une **définition** : c'est elle qui décide « cache ou nouvel objet ». Si les deux chemins ont leur propre logique, tôt ou tard ils divergent.

## Hint 3
`singletons.computeIfAbsent(def.name(), n -> instantiate(def))` pour un singleton ; `instantiate(def)` directement pour un prototype. Par type : filtre les définitions avec `type.isAssignableFrom(def.type())`.
