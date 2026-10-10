## Hint 1
Étape 1 : une map `seen` suffit pour savoir si un ID est déjà passé. Une seconde map évite d'ajouter deux fois le même ID dans `duplicates`.

## Hint 2
Étape 3 : trie une **copie** des indices (ou des jobs) avec `slices.SortStableFunc` par priorité décroissante. Le tri stable garde l'ordre d'arrivée à priorité égale.

## Hint 3
Étape 3 : marque les jobs choisis (par leur position dans `queue`) dans une map ou une slice de booléens, puis construis `rest` en reparcourant `queue` dans l'ordre. Crée `batch` et `rest` avec leur propre `make` : ils ne partagent alors rien.
