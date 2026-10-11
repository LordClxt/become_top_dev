## Contexte

Tinybase ne tient plus sur une machine. Tu écris la couche qui décide **où vit chaque clé** : d'abord un routeur par hachage à **nombre fixe de partitions**, qui rééquilibre en déplaçant des partitions entières ; puis un partitionnement **par plage de clés** qui se **découpe dynamiquement**, comme HBase. Les erreurs, `HashKey` (FNV-1a 32 bits, stable entre processus) et les types sont fournis.

## Jalon 1 — Clé → partition → nœud
- `NewRouter(partitions, nodes)` : la partition `p` va à `nodes[p % len(nodes)]`. Erreurs : aucun nœud (`ErrNoNodes`), moins de partitions que de nœuds (`ErrTooFewPartitions`), nœud en double (`ErrDuplicateNode`).
- `Partition(key)` = `HashKey(key) % Partitions()`. `NodeFor(key)` = le propriétaire de cette partition.
- `Assignment()` : chaque nœud → ses partitions triées. Exemple : 8 partitions sur `a, b, c` donnent `a:[0 3 6] b:[1 4 7] c:[2 5]`.

## Jalon 2 — Rééquilibrer sans tout déménager
- `AddNode(node)` : le nouveau nœud vole des partitions **entières** jusqu'à en avoir `Partitions() / nombre de nœuds` (division entière). À chaque vol, le donneur est le nœud le plus chargé (à égalité : le plus petit nom), qui cède sa partition de **plus grand numéro**. Renvoie la liste des `Move`. Exemple : 64 partitions sur `a b c d`, `AddNode("e")` déplace 60 de `a`, 61 de `b`, 62 de `c`, 63 de `d`, puis 56 de `a`… soit 12 partitions.
- `ModNNode(key, nodes)` : la stratégie naïve `nodes[HashKey(key) % len(nodes)]`.
- `KeysMoved(keys, before, after)` : nombre de clés dont le nœud change.

Le test mesure : avec ton routeur, environ 19 % des clés bougent quand un 5ᵉ nœud arrive ; avec hash mod N, environ 80 %.

## Jalon 3 — Plages de clés et découpage dynamique
- `NewRangePartitioner(maxKeys)` : une seule partition, de borne basse `""`.
- `PartitionOf(key)` : la partition dont la borne basse est la plus grande borne ≤ `key`.
- `Put(key)` : insère la clé (triée, sans doublon) et renvoie l'indice de la partition qui l'a reçue. Si la partition dépasse `maxKeys`, elle est coupée **au milieu** : la gauche garde `keys[:n/2]`, la droite commence à `keys[n/2]` (qui devient sa borne).
- `Boundaries()`, `Keys(i)`, `Len()` : l'état des partitions.
- `Scan(from, to)` : les clés de `[from, to)` dans l'ordre, et le **nombre de partitions** dont la plage recoupe l'intervalle.

Le dernier test écrit des clés horodatées croissantes : toutes doivent tomber dans la **dernière** partition. C'est le point chaud de la leçon 1, reproduit en vrai.
