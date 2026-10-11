## Contexte

Tinybase ne vit plus sur une seule machine. Tu écris le cœur de sa réplication avec leader : un **log de réplication** numéroté, des **followers** qui le rejouent, un **failover** sûr et un **routeur de lectures** qui tient compte du retard. Tout tient en mémoire, sans réseau ni goroutine : on simule les messages par des appels de méthode. Les types, les erreurs, `ReplicaFor` et quelques accesseurs sont fournis.

## Jalon 1 — Le log et le rattrapage
- `Put` donne à chaque écriture la position suivante (`LastLSN() + 1`) et l'époque du leader, l'applique et l'ajoute au log. `LastLSN() = base + len(log)`.
- `Since(lsn)` renvoie une **copie** des entrées de position `> lsn` (slice vide non nil s'il n'y a rien) ; si `lsn < base`, le log ne remonte pas si loin : `ErrSnapshotNeeded`.
- `Snapshot()` copie les données avec la position et l'époque. `NewFollower(s)` copie les données du snapshot et part de sa position.
- `Apply(epoch, entries)` : si `epoch` est **inférieure** à l'époque connue du follower → `ErrStaleEpoch`, rien n'est appliqué ; sinon le follower retient l'époque, puis pour chaque entrée : déjà appliquée (`LSN ≤ position`) → ignorée ; position suivante → appliquée ; sinon → `ErrGap` (on s'arrête, ce qui précède reste appliqué).
- `CatchUp(l)` = `Apply(l.Epoch(), l.Since(position))`.

## Jalon 2 — Le failover et l'époque
- `Promote(followers, epoch)` : aucun follower → `ErrNoCandidate` ; `epoch` doit être **strictement supérieure** à l'époque de chaque follower, sinon `ErrEpoch`. Choisis le follower de plus grande position (à égalité, le premier), annonce `epoch` à **tous** les followers, et renvoie un leader qui reprend une **copie** de ses données, de son log et de sa base, ainsi que son indice.
- Le nouveau leader continue le log : sa première écriture prend la position suivant celle du follower promu.
- Un ancien leader qui se réveille a une époque plus petite : ses envois sont rejetés.
- `LostWrites(old, promotedAt)` : les entrées de l'ancien leader au-delà de la position du promu, jamais reçues par le nouveau.

## Jalon 3 — Le routeur de lectures
- `Write` écrit au leader et retient la position de l'écriture pour l'utilisateur.
- `Read` : le réplica de l'utilisateur est `ReplicaFor(user, len(followers))`. S'il a atteint `Seen(user)`, on y lit ; sinon (ou s'il n'y a pas de follower) on lit au leader, `source = -1`. Dans les deux cas, `Seen(user)` avance jusqu'à la position de la source lue, sans jamais reculer.

## Exemple
Le leader a écrit 10 entrées. Les followers sont aux positions 4, 9 et 7. `Promote(fs, 2)` choisit le follower 1 ; le nouveau leader écrit en position 10, époque 2. L'ancien leader, réveillé, écrit sa propre position 11 : le follower 2 la rejette (`ErrStaleEpoch`), et `LostWrites(old, 9)` liste ses entrées 10 et 11.
