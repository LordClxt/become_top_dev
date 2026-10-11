## Contexte

Le danger du B-tree, d'après la leçon : un éclatement de page écrit **plusieurs pages** (les deux moitiés et le parent). Si la machine s'arrête entre deux écritures, l'index est corrompu. La parade est le **write-ahead log**. Tu construis un B+tree sur un disque simulé qui peut planter à n'importe quelle écriture, et tu démontres qu'il se relève toujours.

## Le disque (fourni dans `disk.go`, à ne pas modifier)

- `ReadPage`, `WritePage`, `WriteRoot`, `Root`, `AllocPageID` : le stockage des pages.
- `AppendWAL(Batch)` : journalise **atomiquement** un batch (`Pages` modifiées + nouvelle `Root` si non nulle) ; `WAL()` ; `TruncateWAL()`.
- `CrashAfter(n)` : la n+1-ième écriture (`WritePage` ou `WriteRoot`) échoue avec `ErrCrash`, et le disque refuse alors tout jusqu'à `Revive()` (le redémarrage), qui conserve l'état durable.

## À implémenter dans `tree.go`

- **`Open(d, maxKeys)`** : d'abord la **reprise** : réapplique chaque batch du WAL (pages par identifiant croissant, puis la racine), puis efface le journal. Le rejeu doit être **idempotent** : un crash pendant la reprise ne doit rien casser. Si le disque n'a pas d'arbre, crée une racine feuille vide (journalisée aussi).
- **`Put`** : prépare **toutes** les pages modifiées en mémoire, journalise **un seul batch**, applique-le aux pages, efface le journal. Mêmes règles d'éclatement que dans le TP B-tree (feuille : la plus petite clé de la moitié droite monte ; page interne : la clé du milieu monte ; la racine qui éclate crée une nouvelle racine).
- **`Get`, `Range`, `Height`** : lecture des pages depuis le disque.

## Ce que les tests font

Pour 60 insertions successives et **chaque point de crash** de 0 à 12 écritures, ils interrompent un `Put`, redémarrent, puis vérifient que l'arbre est cohérent (clés triées, intervalles respectés, feuilles à la même profondeur, **aucune page orpheline**), que toutes les anciennes clés sont là, et que la clé du `Put` interrompu y est aussi, puisque son batch était déjà journalisé.
