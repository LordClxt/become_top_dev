## Hint 1
Garde une `map[string]int` « nom → identifiant » pendant la boucle de `Normalize` : si le nom est absent, crée la ligne et attribue `len(db.Orgs)+1`.

## Hint 2
Pour `Join`, construis d'abord `map[int]string` (identifiant → nom d'organisation) et `map[int][]Position` (utilisateur → postes), puis parcours `db.Users` dans l'ordre.

## Hint 3
Un utilisateur sans entrée dans la map obtient naturellement une slice `nil` : ne crée pas de slice vide.
