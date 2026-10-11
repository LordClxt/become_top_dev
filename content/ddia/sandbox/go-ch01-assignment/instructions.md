## Contexte

Tes recommandations référencent leur auteur et leur organisation par identifiant (relation plusieurs-à-plusieurs, comme dans le livre). La base de documents n'a pas de jointure : tu dois **émuler** la jointure dans le code. Une première version, naïve, fait une requête par document et par référence. Tu écris la bonne version et tu **mesures** la différence avec un compteur de requêtes.

## À implémenter dans `expand.go`

- **`Store.Get`, `Store.GetMany`, `Store.Queries`** : `Get` compte une requête ; `GetMany` en compte **une** pour n'importe quel nombre d'identifiants (zéro si la liste est vide) et ignore les identifiants absents.
- **`ExpandNaive(s, coll, ids, refs)`** : lit chaque document, puis résout chaque champ de `refs` (champ → collection cible) avec un `Get`. Documents absents ignorés ; ordre de `ids` conservé.
- **`Expand(s, coll, ids, refs)`** : même résultat, au plus `1 + len(refs)` requêtes : une pour les documents, puis une par champ de référence sur les identifiants **distincts**.

## Règles de résolution (les deux fonctions)

- Le champ de référence est remplacé par le document référencé ; **nil** si la référence est introuvable.
- Un champ **absent** n'est pas ajouté ; un champ qui n'est **pas une chaîne** reste tel quel.
- Les documents stockés ne sont **jamais modifiés** : renvoie des copies.

## Ce que tu mesures

Pour 6 recommandations et 2 champs de référence, la version naïve émet 18 requêtes, la version groupée 3.
