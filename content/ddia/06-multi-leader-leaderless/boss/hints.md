## Hint 1
Chaque site a ses coordinateur, ses trois réplicas et sa zone ; les clients ne parlent qu'à leur site.

## Hint 2
Entre les sites, la réplication est asynchrone et va dans les deux sens ; le coordinateur n'attend que le quorum local.

## Hint 3
Pas de leader, pas d'horodatage global : les conflits se résolvent par fusion des siblings (worker de fusion).
