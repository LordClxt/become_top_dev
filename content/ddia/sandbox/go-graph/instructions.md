## Contexte

Tu implémentes l'exemple vedette du chapitre : un petit graphe de lieux et de personnes, et la requête « qui est né aux États-Unis et vit en Europe ? ». En Cypher, elle tient en 4 lignes grâce à `-[:WITHIN*0..]->`. Ici, tu écris le moteur qui exécute ce parcours.

## À implémenter dans `graph.go`

- **`NewGraph`, `AddVertex(id, props)`, `AddEdge(tail, head, label)`** : l'arête reçoit l'identifiant 1, 2, 3… dans l'ordre d'ajout. Si l'un des sommets n'existe pas : `ErrNoVertex`, rien n'est ajouté.
- **`Neighbors(v, label, dir)`** : voisins par arêtes d'étiquette `label`, `Outgoing` (queue → tête) ou `Incoming` (tête → queue), dans l'ordre des identifiants d'arêtes.
- **`Reach(start, label, dir)`** : tous les sommets atteignables en suivant **zéro arête ou plus** d'étiquette `label` (le `*0..` de Cypher), triés par identifiant. Le départ en fait partie. **Le graphe peut avoir des cycles.** Départ inconnu : `nil`.
- **`FindByName(name)`** : identifiants triés des sommets dont la propriété `name` vaut `name`.
- **`Migrated(from, to)`** : noms triés, sans doublon, des personnes avec une arête `born_in` vers un lieu situé dans `from` **et** une arête `lives_in` vers un lieu situé dans `to` (lieux désignés par leur nom, hiérarchie portée par des arêtes `within`).

## Astuce de lecture

Pour trouver les lieux **situés dans** l'Europe, on suit les arêtes `within` en sens **entrant** depuis le sommet « Europe » : c'est ce que le moteur fait en partant des deux lieux, comme décrit dans le livre.
