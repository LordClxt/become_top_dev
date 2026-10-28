## Hint 1
Un ordre en erreur est délégué ; les ordres suivants du même compte attendent dans une file temporaire.

## Hint 2
Les comptes non concernés ne sont pas retardés.

## Hint 3
Perte avant la file : persistance + envoi synchrone. Plantage après lecture : acquittement client. Échec d'écriture : ACID + LPS.
