## Hint 1
Exécuteur : garde la fin de la file dans une promesse (`this.#tail`) et enchaîne chaque procédure avec `.then`. Avant chaque procédure, `store.begin()` ; si elle lève une erreur, `store.end(true)` annule les écritures retenues par `set`, puis relance l'erreur sans bloquer la file.

## Hint 2
`acquire` : un verrou est accordé si le mode est compatible avec les autres détenteurs ET que personne n'attend (sauf promotion). Sinon, mets la demande en file puis cherche un cycle.

## Hint 3
Graphe d'attentes : une transaction en attente pointe vers chaque détenteur incompatible. Un cycle qui revient sur la transaction qui demande = interblocage.

## Hint 4
Validation : parcours le journal des validations dont le numéro dépasse ton début ; si une clé écrite a été lue (ou correspond à un préfixe recherché), `SerializationError`. Sans écriture, valide toujours.
