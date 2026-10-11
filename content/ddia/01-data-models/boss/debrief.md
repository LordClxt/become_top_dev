**Datalog évalue des règles jusqu'au point fixe.** Ici : tour 1 → 5 faits `in`, tour 2 → 3 faits de plus (`in(paris, europe)`, `in(lyon, europe)`, `in(idaho, namerica)`), tour 3 → rien de nouveau. Total 8. L'évaluation termine toujours parce que le nombre de faits possibles est fini.

La récursion donne ce que SQL de base ne sait pas dire simplement : *parcourir un nombre inconnu de niveaux*. La requête `in(X, europe)` renvoie paris, lyon et france ; la règle `migrant` retrouve Lucy sans qu'on ne décrive **comment** parcourir.

C'est le sens de « déclaratif » : tu dis ce qui est vrai, le moteur trouve les faits, y compris les règles non sûres qu'il refuse.
