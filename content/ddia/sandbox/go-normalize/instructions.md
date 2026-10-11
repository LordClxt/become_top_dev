## Contexte

Une plateforme stocke des CV comme des documents : chaque poste contient le **nom** de l'organisation, copié tel quel. Quand « Maison Babbage » change de nom, il faut réécrire tous les CV qui la mentionnent. Tu vas normaliser ces documents en trois tables, vérifier qu'une jointure les reconstitue, et mesurer ce que coûte un renommage dans chaque modèle.

## À implémenter dans `normalize.go`

- **`Normalize(profiles)`** : produit `Users`, `Orgs` et `Positions`. Chaque nom d'organisation distinct devient **une seule** ligne de `Orgs`, numérotée à partir de 1 dans l'ordre de **première apparition**. Les `PositionRow` référencent l'organisation par `OrgID`. L'ordre des utilisateurs et des postes est conservé.
- **`DB.Join()`** : la jointure inverse. Reconstruit les `Profile` ; un utilisateur sans poste a `Positions == nil`.
- **`DB.RenameOrg(id, name)`** : modifie **une seule ligne**. `false` si l'identifiant n'existe pas.
- **`RenameInDocuments(profiles, old, new)`** : le même renommage sur des documents ; renvoie le nombre de **copies réécrites**.

## Ce que tu constates

Avec l'exemple de test, renommer « Maison Babbage » réécrit 3 copies dans les documents, 1 ligne dans les tables.
