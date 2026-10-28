## archkit, épisode 4

Mesurer ne suffit pas : il faut **gouverner**. Cet épisode donne à archkit trois fitness functions prêtes pour la CI.

### `cyclomatic(g)`
Complexité cyclomatique d'un graphe de flot : **E − N + 2P**, où P est le nombre de composantes connexes (les arêtes sont considérées sans orientation pour les composantes). Une arête vers un nœud absent lève `UnknownNodeError`.

### `findCycles(graph, { internalPrefix? })`
Les cycles d'un graphe d'imports, **nommés** : chaque composante fortement connexe de plus d'un module (ou un module qui s'importe lui-même). Chaque cycle est trié, la liste est triée par premier module. Les imports vers des modules absents du graphe sont ignorés… sauf s'ils commencent par `internalPrefix` : c'est alors un module interne non analysé, et `UnanalyzedModuleError` est levée (souviens-toi de l'enquête de la leçon 3). Un anneau de 20 000 modules ne doit pas faire déborder la pile.

### `cycleKey(cycle)` et `ratchet(current, baseline)`
`cycleKey` donne un identifiant stable (modules triés joints par `|`). Le **cliquet** compare les violations actuelles à la référence : `added` (nouvelles, elles font échouer), `fixed` (disparues), `pass`, et `nextBaseline` (resserrée si tout passe, inchangée sinon).
