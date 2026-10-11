## Hint 1
Stocke les propriétés dans une `map[int]map[string]string` et les arêtes dans une slice ; l'identifiant d'une arête est sa position + 1.

## Hint 2
`Reach` est un parcours en largeur : une file, un ensemble `seen` pour ne jamais revisiter un sommet (c'est ce qui évite la boucle infinie sur un cycle), puis un tri des résultats.

## Hint 3
`Migrated` : pour chaque lieu nommé, `Reach(lieu, "within", Incoming)` donne tous les lieux qu'il contient (lui compris) ; les personnes sont les voisins entrants `born_in` / `lives_in` de ces lieux. Intersecte les deux ensembles.
