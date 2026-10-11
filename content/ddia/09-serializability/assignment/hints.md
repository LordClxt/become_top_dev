## Hint 1
Un cœur traite 1 / (durée d'une procédure) transactions par seconde. Avec des multi-partitions plafonnées à C par seconde et une part p, le débit total ne dépasse ni C / p, ni la capacité cumulée des partitions.

## Hint 2
Seuls deux verrous partagés sont compatibles. Une montée de verrou réussit si personne d'autre ne détient de verrou ; deux montées simultanées sur la même ligne forment un cycle.

## Hint 3
Sous SSI, personne n'attend : les transactions se préviennent, la première à valider gagne, la seconde est abandonnée à son commit et doit tout relire.
