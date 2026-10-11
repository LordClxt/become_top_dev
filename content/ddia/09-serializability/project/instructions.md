## Contexte

Tinybase sait stocker, répliquer et partitionner ; il lui manque l'isolation la plus forte. Tu écris les deux moteurs du chapitre, en version **déterministe** : pas de vraie concurrence, pas de goroutines. Chaque appel est un **pas** de la simulation, et une transaction « bloquée » est simplement une transaction dont la demande attend dans une file. Les types, les erreurs et une suggestion de structures sont fournis dans `locks.go`.

## Jalon 1 — Verrous partagés et exclusifs
`Acquire(tx, key, mode)` renvoie `true` si le verrou est accordé, `false` si la transaction doit attendre (sa demande va en fin de file de la clé).
- Seuls deux verrous **partagés** sont compatibles.
- Redemander un verrou déjà détenu dans un mode au moins aussi fort : accordé.
- **Montée de verrou** : une transaction qui détient un partagé et demande l'exclusif l'obtient dès que **personne d'autre** ne détient la clé, sinon elle attend.
- **Équité** : une nouvelle demande ne double pas une file non vide, même si elle est compatible avec les détenteurs.
- Mode invalide : `ErrBadMode`. Une transaction déjà en attente ne peut rien demander : `ErrBlocked`.

`ReleaseAll(tx)` relâche tous les verrous de `tx` et retire sa demande en attente, puis, **clé par clé dans l'ordre alphabétique**, accorde les demandes en tête de file tant qu'elles sont compatibles. Il renvoie les transactions débloquées, dans cet ordre. `Holders(key)` renvoie une copie des détenteurs.

## Jalon 2 — Le graphe d'attente
`WaitsFor(tx)` renvoie, **triées**, les transactions que `tx` attend : les détenteurs dont le verrou est incompatible avec sa demande, plus les demandes placées **avant** elle dans la file.

Avant de mettre une demande en attente, `Acquire` vérifie si elle fermerait un **cycle** (en suivant `WaitsFor` depuis le demandeur, revient-on à lui ?). Si oui, la demande n'est pas mise en file et `Acquire` renvoie `ErrDeadlock` : le demandeur est la victime, l'appelant fera `ReleaseAll`.

## Jalon 3 — Le validateur SSI
Une horloge compte les commits. `Begin(tx)` mémorise sa valeur (le snapshot). `Read` et `Write` notent les clés lues (les **prémisses**) et écrites.

`Commit(tx)` :
- une transaction **sans écriture** valide toujours ;
- sinon, si une transaction validée **après le début** de `tx` a écrit une clé que `tx` a lue ou écrite, `tx` est abandonnée : renvoie une erreur qui enveloppe `ErrSerialization` (`fmt.Errorf("%w …", ErrSerialization, …)`) ;
- sinon l'horloge avance et la validation est enregistrée avec ses écritures.

Dans tous les cas `tx` n'est plus active (`ErrUnknownTx` ensuite). Après `Commit` ou `Abort`, oublie les validations qu'aucune transaction active ne peut voir comme concurrentes : `Retained()` en donne le nombre.

## Exemple
Les médecins : T42 et T43 lisent `alice` et `bob`, T42 écrit `alice`, T43 écrit `bob`. T42 valide : succès. T43 valide : `ErrSerialization`, sa prémisse « Alice est de garde » est fausse.
