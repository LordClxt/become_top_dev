## Contexte

Les données dérivées de Tinybase (statistiques, index, recommandations) se recalculent **par lots** à partir d'entrées immuables. Tu écris le moteur : un MapReduce **en mémoire**, sans réseau ni disque, mais avec les mêmes étapes qu'Hadoop. Puis tu t'en sers pour joindre des événements de navigation à des profils d'utilisateurs, de deux façons. Les types, l'encodage des lignes et les erreurs sont fournis.

## Jalon 1 — Le moteur
- `Partition(key, n)` : FNV-1a 32 bits (`hash/fnv`) modulo `n`.
- `Job.Run()` :
  1. pour chaque entrée, dans l'ordre, appelle son `Map` sur chaque enregistrement ;
  2. range chaque paire émise dans la partition `Partition(PartitionKey(clé), Reducers)` (`PartitionKey` nil = la clé entière) ;
  3. trie chaque partition par **clé complète**, de façon **stable** (à clé égale, l'ordre d'émission est conservé) ;
  4. appelle `Reduce` une fois par **groupe** de clés consécutives de même `GroupKey` (nil = la clé entière), avec la clé de groupe et les valeurs dans l'ordre trié ;
  5. renvoie une sortie par reducer : `len(résultat) == Reducers`.
- `Reducers < 1` : `ErrNoReducers`. `Reduce` ou un `Map` nil : `ErrNoFunc`.

## Jalon 2 — La jointure sort-merge côté reduce
`ReduceSideJoin(users, events, reducers)` : une **jointure interne** (un événement sans profil disparaît, un profil sans événement aussi), écrite avec `Job` et **deux entrées** (deux mappers). L'astuce est le **tri secondaire** : la clé émise est `UserID` + un suffixe qui place le profil **avant** les événements, eux-mêmes rangés par `At` (horodatage positif ; pense à un nombre à largeur fixe). La partition et le groupe ne regardent que l'`UserID`. Le reducer garde le profil, puis émet une ligne par événement. Résultat **trié par UserID puis At** (à égalité : l'ordre d'entrée). Deux profils de même `ID` : `ErrDuplicateUser`.

## Jalon 3 — Côté map, et toujours le même résultat
- `BroadcastHashJoin(users, events, mappers)` : aucune phase reduce, aucun tri. Les événements sont coupés en `mappers` tranches contiguës de taille `ceil(len/mappers)` ; chaque tâche charge **tous** les profils dans une table de hachage et parcourt sa tranche. Sortie dans l'ordre des événements. `mappers < 1` : `ErrNoMappers` ; profils en double : `ErrDuplicateUser`.
- Une fois triée par (UserID, At), cette sortie doit être **identique** à celle de `ReduceSideJoin`, quel que soit le nombre de tâches, à chaque exécution.
- `ReducerLoad(events, reducers)` : nombre d'événements reçus par chaque reducer si l'on partitionne par `UserID`. Les tests y glissent une « célébrité » : tu verras un reducer crouler sous le travail.

## Exemple
Profils `u1 Ada`, `u2 Linus` ; événements `(u2, 300, /cart)`, `(u1, 200, /home)`, `(u4, 100, /ghost)`. La jointure rend `(u1, Ada, 200, /home)` puis `(u2, Linus, 300, /cart)` ; `u4` n'a pas de profil, il disparaît.
