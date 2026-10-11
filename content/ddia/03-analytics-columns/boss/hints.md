## Hint 1
Commence par la production : caisses → base transactionnelle ; puis l'ETL qui lit cette base.

## Hint 2
Les écritures récentes ne vont pas directement dans les colonnes : elles passent par la mémoire, puis une fusion en bloc.

## Hint 3
Deux copies en colonnes, triées différemment, dans la zone « Entrepôt de données ».
