**Sans jointure dans la base, c'est à toi de regrouper.** La version naïve fait 150 requêtes (450 ms de réseau) pour 50 documents : c'est le piège **N+1**. La version groupée en fait 3 (9 ms), parce qu'elle lit **les identifiants distincts** d'un coup : 20 auteurs, 5 organisations.

Les relations plusieurs-à-plusieurs se représentent par **références** : on les remplace par les documents lus à la fin, sur une copie. À l'inverse, ce qui appartient à un seul document (adresse, postes d'un CV) s'**embarque**, pour obtenir la localité sans jointure.

Règle pratique : *embarque ce qui se lit avec le document, référence ce qui est partagé.*
