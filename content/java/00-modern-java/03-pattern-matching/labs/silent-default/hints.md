## Hint 1
Écris une journée minimale à la main (une seule vente, puis un seul événement de chaque autre type) et compare le solde attendu à celui calculé. Deux types d'événements ne donnent pas le bon montant.

## Hint 2
Regarde comment chaque fichier choisit ce qu'il fait d'un événement ou d'un type de frais : un `default` qui « ne fait rien », et un vieux `switch` à deux-points. Que se passe-t-il quand un case n'a pas de `break` ?

## Hint 3
Dans `FeePolicy`, une switch-expression à flèches (`case CANCELLATION -> 500;`) supprime le fall-through. Dans `Ledger` (et partout où l'on choisit selon le type d'événement), retire le `default` et traite `Chargeback` explicitement : sur une interface scellée, le compilateur exige alors un case par variante. Vérifie aussi le décompte du rapport.
