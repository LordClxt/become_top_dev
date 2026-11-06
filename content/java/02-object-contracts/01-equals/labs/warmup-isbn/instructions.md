## Contexte

La librairie importe ses stocks depuis deux fournisseurs. L'un écrit `978-2-07-036822-8`, l'autre `9782070368228`. C'est le même livre, mais `stock.contains(isbn)` répond `false` : `Isbn` n'a pas redéfini `equals`, donc deux instances ne sont égales que si c'est **le même objet**.

## Ta mission

Dans `Isbn.java`, écris `equals` avec la recette de la leçon :

1. `==` comme raccourci ;
2. `instanceof` avec pattern (`o instanceof Isbn other`) ;
3. comparaison du champ significatif : les 13 chiffres normalisés.

```java
Isbn.parse("978-2-07-036822-8").equals(Isbn.parse("9782070368228"))  // true
Isbn.parse("9782070368228").equals("9782070368228")                  // false : une String n'est pas un Isbn
Isbn.parse("9782070368228").equals(null)                             // false, sans exception
```

`hashCode` est déjà écrit (c'est la leçon suivante). N'oublie pas `@Override`.
