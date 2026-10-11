## Contexte

Jusqu'ici, Tinybase stockait des clés et des valeurs. Il devient maintenant la **source d'un flux** : chaque écriture est un message dans un **log partitionné en ajout seul**, que des **groupes de consommateurs** lisent à leur rythme, comme dans Kafka. Les systèmes dérivés (un index, un cache) se construisent en consommant ce log, ce qui remplace les doubles écritures par une capture des changements. Le type `Log`, son constructeur `NewLog`, le choix de partition `PartitionFor` (hachage de la clé), le type `Message` et les erreurs sont fournis.

## Jalon 1 — Le log partitionné
- `Append(key, value)` ajoute le message à la fin de la partition `PartitionFor(key)`. Les offsets valent 0, 1, 2… **dans chaque partition** séparément. Clé vide : `ErrEmptyKey`.
- `Delete(key)` ajoute une **tombstone** (`Tombstone: true`).
- `EndOffset(p)` renvoie le prochain offset de la partition (`ErrNoPartition` si elle n'existe pas).
- `Read(p, from, max)` renvoie, dans l'ordre, au plus `max` messages (tous si `max <= 0`) d'offset `>= from`. `from` doit être entre 0 et `EndOffset(p)` inclus, sinon `ErrOffsetOutOfRange` ; à la fin du log, on renvoie une slice vide **non nil**. Renvoie une **copie**.

Exemple : sur un log d'une partition, `Append("a","1")`, `Append("b","2")`, `Delete("a")` donnent les offsets 0, 1, 2 et `EndOffset(0) == 3`.

## Jalon 2 — Les groupes de consommateurs
- `Commit(group, p, offset)` enregistre la position du groupe ; tout offset de 0 à `EndOffset(p)` est permis, y compris **en arrière** (rejeu).
- `Committed(group, p)` vaut 0 pour un groupe qui n'a jamais validé.
- `Poll(group, p, max)` lit depuis l'offset validé **sans l'avancer** : c'est au consommateur de valider après avoir traité.
- `Lag(group, p)` = `EndOffset(p) − Committed(group, p)`.
- `Assign(partitions, consumers)` trie les noms et donne la partition `i` au consommateur `i % len`. Chaque consommateur a une slice **non nil** ; au-delà du nombre de partitions, certains restent inactifs.

## Jalon 3 — Compaction et vue dérivée
- `Compact(p, dropTombstones)` ne garde, pour chaque clé, que son **dernier** message, à son **offset d'origine** et dans l'ordre. La fin du log ne bouge pas. Avec `dropTombstones`, une clé dont le dernier message est une tombstone disparaît.
- `CatchUp(group, view)` applique à `view` les messages de chaque partition depuis l'offset validé du groupe (une valeur remplace, une tombstone supprime), valide la fin du log et renvoie le nombre de messages appliqués.

Exemple : la partition `a=1, b=2, a=3, c=4, b=∅, a=5, d=6, c=7` (offsets 0 à 7) se compacte en offsets `4, 5, 6, 7` ; avec purge des tombstones, `5, 6, 7`. Un groupe neuf qui fait `CatchUp` obtient `{a:5, c:7, d:6}`, avant comme après compaction.
