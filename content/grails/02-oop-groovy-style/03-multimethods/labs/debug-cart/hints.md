## Hint 1
Compare la façon dont `Invoice` et `Cart` décident que deux lignes « sont la même ». L'un utilise du Groovy (`==`, `unique()`), l'autre une `HashMap` Java. Est-ce que les deux appellent la même méthode ?

## Hint 2
Ouvre `Line.groovy` et regarde la signature de son `equals`. Une `HashMap` appelle `equals(Object)` et `hashCode()`. Que se passe-t-il si `equals(Object)` n'est jamais redéfini, et si `hashCode` ne l'est pas non plus ?

## Hint 3
Remplace la surcharge `equals(Line)` par le vrai contrat : `@EqualsAndHashCode(includes = 'sku')`, ou un `boolean equals(Object o)` et un `int hashCode()` écrits à la main, tous deux fondés sur `sku`. Rien d'autre à changer.
