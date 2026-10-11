## Hint 1
L'état est l'accumulation des événements : pars de 0 et applique-les dans l'ordre du log.

## Hint 2
Une commande peut échouer ; un événement est ce qui reste quand elle a réussi. Un consommateur ne rejette jamais un événement.

## Hint 3
Un événement métier ne remplace pas le précédent : la compaction par clé ne s'applique pas. Pour l'effacement, pense à ce que contient encore l'ancien événement.
