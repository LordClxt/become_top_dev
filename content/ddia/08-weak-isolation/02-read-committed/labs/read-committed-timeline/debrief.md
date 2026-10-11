**Read committed ne montre que du validé.** Pendant que T1 n'a pas validé x = 300, T2 lit 500 ; après le commit, 300. Et l'écriture x = 700 d'une transaction abandonnée n'est jamais vue, alors qu'en read uncommitted un lecteur aurait décidé sur une valeur qui n'a jamais existé.

L'implémentation sans verrou de lecture se paie en mémoire : la base garde l'ancienne valeur validée de chaque ligne modifiée et pas encore validée, soit **2 000 000 × 250 o = 500 Mo** pour une grosse migration en une seule transaction. Mais aucun lecteur n'attend.

Enfin, read committed **ne protège pas** le compteur : les deux lisent 10, les deux écrivent 11. Ce n'est pas une écriture sale, la seconde écrit après le commit de la première. C'est une mise à jour perdue, et il faudra d'autres outils.
