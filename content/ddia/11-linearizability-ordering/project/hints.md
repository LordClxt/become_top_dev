## Hint 1
Lamport : `Observe` n'est que `max` puis `+1`. Pour `Less`, compare les compteurs, et seulement s'ils sont égaux, les identifiants.

## Hint 2
Linéarisabilité : à chaque étape, une opération restante est candidate si **aucune autre opération restante** ne s'est terminée avant son début (`other.End < op.Start`). Essaie chaque candidate dont le résultat est cohérent avec l'état du registre, descends récursivement, et défais ton choix si la branche échoue.

## Hint 3
Réplique : garde `next` (le numéro attendu, 1 au départ) et une table `pending` numéro → message. Dans `Receive`, rejette `m.Seq < next` et les numéros déjà en attente ; range `m`, puis boucle tant que `pending[next]` existe : retire-le, ajoute-le au log et à la sortie, incrémente `next`.
