## Hint 1
M1 : la recette d'equals et de hashCode sur deux champs, puis `Long.compare` après avoir vérifié la devise. M2 : un `TreeSet` trié par un `Comparator`… mais attention à ce que le `TreeSet` considère comme « déjà présent ».

## Hint 2
Le temps d'arrivée n'est pas dans `Order` : `BookSide` attribue un numéro de séquence croissant à chaque `add` et range des entrées `(ordre, séquence)`. Le comparateur : prix (inversé pour les achats), puis séquence. La séquence étant unique, deux entrées ne se comparent jamais à 0. Une `Map<String, Entry>` par identifiant rend `remove` et le contrôle des doublons immédiats.

## Hint 3
`valueOf` : coupe sur la dernière espace, `Currency.valueOf(code)` (rattrape l'`IllegalArgumentException` pour citer le texte), puis réutilise `parse`. Pour les achats, `Comparator.comparing(e -> e.order().limit().orElseThrow(), Comparator.reverseOrder())`. `copyOf` recopie les entrées **avec leur séquence** et reprend le compteur de séquence de l'original.
