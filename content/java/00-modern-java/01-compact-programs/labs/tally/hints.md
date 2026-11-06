## Hint 1
Supprime la classe, les imports et `public static` : il reste `void main() { … }`. Tout `java.base` est importé, `LinkedHashMap` compris. `IO.readln()` renvoie `null` à la fin de l'entrée.

## Hint 2
Garde deux `LinkedHashMap<String, Long>` (quantités et montants en centimes) : ils conservent l'ordre de première insertion. `merge(article, valeur, Long::sum)` additionne. Une `NumberFormatException` attrapée suffit pour les nombres illisibles.

## Hint 3
Pour l'affichage, `"%d.%02d".formatted(cents / 100, cents % 100)`. Découpe avec `line.split(";", -1)` pour que `a;1;` donne bien 3 champs (dont un vide, donc invalide), puis `strip()` chaque champ.
