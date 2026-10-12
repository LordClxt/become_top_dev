## Contexte

Groovy transforme chaque opérateur en appel de méthode (`a + b` est `a.plus(b)`), et chaque test en « vérité Groovy » (`if (x)`). Tu fabriques un petit type monétaire qui s'utilise comme un nombre, puis deux utilitaires de **Minigrails**.

## Partie 1 : `Money` (fichier `Money.groovy`)

`Money` stocke un nombre de centimes (`long cents`). Implémente :

| Écriture | Méthode | Résultat |
|---|---|---|
| `a + b`, `a - b` | `plus`, `minus` | nouveau `Money` |
| `a * 1.5` | `multiply(Number)` | arrondi au centime, **half-up** |
| `-a` | `negative()` | nouveau `Money` opposé |
| `a < b`, `a >= b`, `==` | `Comparable` | comparaison par centimes |
| `if (a)` | `asBoolean()` | `false` si zéro |
| `println a` | `toString()` | `12.50 €`, `-3.05 €`, `0.00 €` |
| `Money.of('12.50')` | statique | construit depuis un texte décimal |

L'égalité (`==`) doit comparer les centimes : `Money.of('1') == Money.of('1.00')`. Une annotation de `groovy.transform` fait `equals` et `hashCode`.

⚠️ `Money` ne doit jamais passer par `double` : un test vérifie que `Money.of('0.1') + Money.of('0.2') == Money.of('0.3')` et que `Money.of('0.05') * 1.5` donne `0.08` (7,5 centimes arrondis vers le haut).

## Partie 2 : `Ops.classify(Object x)` (fichier `Ops.groovy`)

Écris un `switch` qui renvoie :

| Valeur | Résultat |
|---|---|
| `null` | `'nothing'` |
| un `Integer` de 0 à 9 | `'digit'` |
| tout autre `Number` | `'number'` |
| une chaîne composée uniquement de chiffres | `'numeric text'` |
| toute autre chaîne | `'text'` |
| une collection vide | `'empty list'` |
| une autre collection | `'list'` |
| une `Map` | `'map'` |
| le reste | `'object'` |

## Partie 3 : accès sécurisés

- `Ops.city(person)` renvoie `person.address.city`, ou `'inconnue'` si la personne, l'adresse ou la ville manque (ou est vide). Une seule expression.
- `Ops.firstFilled(List<String> values)` renvoie la première valeur non vide **après `trim`** (les espaces seuls comptent comme vides), ou `null`.
