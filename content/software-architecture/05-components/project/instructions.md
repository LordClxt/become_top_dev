## archkit, épisode 6

Un monolithe modulaire ne le reste que si ses frontières sont protégées. Cet épisode ajoute à archkit la fitness function des domaines et une analyse d'impact.

### Conventions
- Chaque dossier directement sous `root` est un **domaine** : `src/orders/web/form.ts` → `orders`. Un fichier à la racine (`src/main.ts`) n'appartient à aucun domaine.
- Un domaine n'expose que **`index.ts`** à sa racine (`src/orders/index.ts`).
- `allowed` déclare les dépendances entre domaines ; les domaines de `shared` sont importables par tous sans déclaration (mais toujours via leur index).

### `checkBoundaries(graph, b)`
Pour chaque import vers **un autre** domaine (doublons ignorés) : `deep-import` s'il ne vise pas l'index du domaine cible, `undeclared` si la dépendance n'est ni déclarée ni vers un domaine partagé. Les deux peuvent s'appliquer au même import. Tri par `from`, `to`, `kind`.

### `domainGraph(graph, root)` et `domainsInCycles(graph, root)`
Le graphe des domaines réellement utilisés (clés triées, voisins triés et uniques, domaines cibles inclus même sans fichier source), puis la liste triée des domaines qui appartiennent à un cycle.

### `impact(graph, changed, root)`
Les domaines touchés par des fichiers modifiés : ceux des fichiers, plus tous les domaines qui en dépendent, directement ou transitivement. Les fichiers hors domaine sont ignorés ; un cycle ne doit pas faire boucler l'analyse.
