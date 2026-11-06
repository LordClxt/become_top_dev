## Hint 1
Une `HashMap` retrouve une clé si elle a le même `hashCode` **et** que `equals(Object)` renvoie `true`. Vérifie chacune de ces deux conditions pour les clés qu'utilise `Checkout`, en créant deux objets **distincts** de même valeur.

## Hint 2
Première cause : la signature d'une méthode de `Sku`. Seconde cause : ce que devient la liste d'options **après** qu'elle a servi de clé. Qui la modifie ?

## Hint 3
Dans `Sku`, `equals` doit prendre un `Object` (et porter `@Override`). Dans `PriceKey`, copie la liste reçue avec `List.copyOf(options)` : la clé devient immuable, et ce que fait `Checkout` de sa liste n'a plus d'effet sur elle.
