## Contexte

Jusqu'ici, Tinybase exécutait chaque opération seule. Tu lui ajoutes des **transactions en snapshot isolation**, implémentées comme dans PostgreSQL : par **contrôle de concurrence multiversion** (MVCC). Rien n'est écrasé : chaque écriture crée une **version** marquée `CreatedBy`, et l'ancienne reçoit `DeletedBy` au commit. Chaque lecteur trie ensuite les versions avec des **règles de visibilité**. Les types, `NewStore`, `Versions` et `Status` sont fournis ; tout se passe sous un seul verrou `s.mu`.

## Jalon 1 — Identifiants et versions
- `Begin` donne des identifiants **strictement croissants** (1, 2, 3…), met la transaction `InProgress` et retient l'ensemble des transactions **en cours à cet instant** (`active`). Renseigne aussi `s.xmin[id]` = le plus petit identifiant parmi `active` et `id` (servira au jalon 3).
- `Put` crée une version en attente `{value, CreatedBy: id, DeletedBy: 0}` ; un second `Put` sur la même clé modifie cette version au lieu d'en créer une autre. `Delete` retire la version en attente de la transaction s'il y en a une. Dans les deux cas, la clé est notée dans `writes`.
- `Commit` : pour chaque clé de `writes`, la **dernière version validée et vivante** reçoit `DeletedBy = id`, puis le statut passe à `Committed`. `Abort` passe à `Aborted` sans rien marquer. Ensuite, toute opération renvoie `ErrTxClosed`. Retire la transaction de `s.xmin` quand elle se termine.

Exemple : `a=1` (tx 1), puis `a=2` (tx 2), puis `Delete(a)` (tx 3) donnent `[{1 1 2} {2 2 3}]`.

## Jalon 2 — Les règles de visibilité
`Get` regarde d'abord les **propres écritures** de la transaction (`writes`) : sa version en attente, ou « absent » après un `Delete`. Sinon, une version est visible si :
1. elle a été créée par une transaction **validée**, d'identifiant **plus petit**, et **absente de `active`** (pas en cours au démarrage) ;
2. et elle n'est pas supprimée, ou supprimée par une transaction qui **ne** remplit **pas** ces conditions.

`Scan` renvoie toutes les clés visibles, **triées**, avec les propres écritures. C'est ce qui permet une sauvegarde cohérente pendant que les écritures continuent.

## Jalon 3 — Premier qui valide gagne
- Au `Commit`, **avant** de marquer quoi que ce soit : si une clé de `writes` porte une version créée ou supprimée par une transaction **validée mais invisible** pour toi (donc concurrente), passe à `Aborted` et renvoie `ErrWriteConflict`. C'est la détection automatique des mises à jour perdues.
- Deux transactions qui écrivent des clés **différentes** valident toutes les deux, même si elles ont pris leur décision sur des données lues : c'est le **write skew**, que ce mécanisme ne voit pas.
- `Vacuum` supprime les versions des transactions abandonnées, et celles supprimées par une transaction validée d'identifiant **strictement inférieur à l'horizon** = le plus petit `xmin` des transactions en cours (ou le prochain identifiant s'il n'y en a pas). Il renvoie le nombre de versions supprimées.
