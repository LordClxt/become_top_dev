## Hint 1
Le repeatable read de PostgreSQL est un snapshot isolation qui détecte les mises à jour perdues ; il ne voit rien quand deux transactions écrivent des lignes différentes.

## Hint 2
Une place vendue deux fois : deux INSERT d'une ligne qui n'existait pas. Un quota par fan : il existe une ligne par fan, qu'on peut verrouiller ou mettre à jour sous condition.

## Hint 3
Transaction de 2 heures : 300 mises à jour par seconde × 7 200 secondes, chacune laisse une ancienne version de 200 octets que le ramasse-miettes ne peut pas supprimer.
