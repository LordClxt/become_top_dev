## Hint 1
Une version porte `createdBy` et `deletedBy`. Une mise à jour = marquer l'ancienne version supprimée par ta transaction + ajouter une nouvelle version créée par elle.

## Hint 2
`txVisible(id, self, s)` : tes propres écritures sont visibles ; celles des autres seulement si elles sont validées, d'identifiant < `s.next` et pas dans `s.inProgress`.

## Hint 3
En read committed, reprends un instantané à **chaque** lecture ; en isolation par instantané, garde celui du début.

## Hint 4
Conflit : parmi les versions de la clé, y en a-t-il une créée ou supprimée par une transaction **validée mais invisible** pour ton instantané ? Si oui, `ConflictError`.
