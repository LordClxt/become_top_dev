## Hint 1
Commence par `Deposit` : un test `a == nil` en premier, puis le montant, puis `a.Balance += amount`. Go déréférence tout seul pour accéder aux champs d'un pointeur de struct.

## Hint 2
`Withdraw` et `Transfer` suivent la même forme : toutes les validations d'abord, la modification en dernier. C'est ce qui garantit qu'une erreur ne laisse aucun compte à moitié modifié. Dans `Transfer`, `from == to` compare deux adresses.

## Hint 3
`Snapshot` : renvoie `*a` (une copie de la struct) tant que `a != nil`. `Ensure` : `&Account{}` crée à chaque appel une nouvelle struct et renvoie son adresse. Rappelle-toi que renvoyer l'adresse d'une variable locale est sans danger en Go : elle est allouée sur le tas si besoin.
