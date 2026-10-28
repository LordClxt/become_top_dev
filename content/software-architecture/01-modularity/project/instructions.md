## archkit, épisode 2

Le vérificateur de couches d'archkit dit si une règle est respectée. Il faut maintenant **mesurer** la structure : où sont les modules rigides, les abstractions inutiles, les classes qui en contiennent plusieurs ?

### `couplingMetrics(files, threshold = 0.5)`
Chaque `SourceFile` donne son chemin, ses imports (résolus) et son nombre d'éléments abstraits et concrets. Un **package** est le dossier du fichier (`packageOf`).
- **Ca** : nombre de packages **distincts** qui importent ce package ; **Ce** : nombre de packages distincts qu'il importe. Les imports internes au package et ceux vers des fichiers inconnus (hors analyse) sont ignorés.
- **I = Ce / (Ce + Ca)** (0 pour un package isolé), **A = abstraits / (abstraits + concrets)** (0 pour un package vide), **D = |A + I − 1|**, arrondis à 3 décimales.
- **zone** : `main-sequence` si D ≤ seuil, sinon `pain` si A + I < 1, sinon `uselessness`.
- Résultat trié par nom de package.

### `lcom(uses)`
`uses` associe chaque méthode aux champs qu'elle utilise. Regroupe les méthodes reliées **de proche en proche** par un champ partagé ; une méthode sans champ forme son propre groupe. Groupes triés, `score` = nombre de groupes. Il doit rester rapide sur 2 000 méthodes.
