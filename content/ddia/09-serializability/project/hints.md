## Hint 1
Exécuteur : une seule goroutine lit les tâches depuis un canal. Avant chaque procédure, mémorise la valeur d'origine de chaque clé écrite (`Set`), pour annuler si elle renvoie une erreur.

## Hint 2
`Acquire` : un verrou est accordé si le mode est compatible avec les autres détenteurs ET que personne n'attend (sauf promotion). Sinon, mets la demande en file puis cherche un cycle.

## Hint 3
Graphe d'attentes : une transaction en attente pointe vers chaque détenteur incompatible. Un cycle qui revient sur la transaction qui demande = interblocage.

## Hint 4
Validation : parcours le journal des validations dont le numéro dépasse ton début ; si une clé écrite a été lue (ou correspond à un préfixe recherché), `ErrSerialization`. Sans écriture, valide toujours.
