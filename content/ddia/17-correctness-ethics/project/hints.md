## Hint 1
Requêtes : une map identifiant → position suffit ; comparer deux `Request` avec `==` marche car tous les champs sont comparables. Partitions de comptes : une map dont la clé est une petite struct `{requête, compte, opération}`.

## Hint 2
`Registry` a besoin, par partition, de la position déjà traitée, d'une map pseudo normalisé → propriétaire et d'une map identifiant → décision. Dans `Process`, regarde d'abord si l'identifiant a déjà une décision : si oui, réémets-la telle quelle.

## Hint 3
`Audit` : construis l'union des comptes des deux maps (lire une clé absente donne 0), compare, puis `sort.Slice` par compte. `Expected` ignore un identifiant déjà vu, exactement comme `Submit`.
