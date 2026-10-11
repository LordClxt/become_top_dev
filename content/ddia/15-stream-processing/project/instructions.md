## Contexte

Tinybase sait déjà transporter des événements dans un log partitionné. Il doit maintenant les **traiter en continu** : compter et sommer par fenêtre de temps, décider quand un résultat est publiable alors que des événements arrivent en désordre, découper l'activité en sessions, et survivre à une panne sans compter deux fois. Tous les temps sont des entiers (secondes), et ce sont des **temps de l'événement** : l'horloge de la machine n'intervient jamais. Les types sont fournis.

## Jalon 1 — Placer un événement dans ses fenêtres
- `TumblingWindow(t, size)` : la fenêtre `[début, fin)` de taille `size` qui contient `t`. `TumblingWindow(42, 60) = [0, 60)`, `TumblingWindow(60, 60) = [60, 120)`, `TumblingWindow(-30, 60) = [-60, 0)`.
- `HoppingWindows(t, size, hop)` : toutes les fenêtres de taille `size`, dont le début est un multiple de `hop`, qui contiennent `t`, triées par début. `HoppingWindows(95, 120, 60) = [[0, 120), [60, 180)]`. `nil` si `size` ou `hop` ≤ 0.

## Jalon 2 — Le watermark décide
`NewAggregator(size, hop, maxDelay)` agrège par **clé** et par fenêtre hopping (tumbling si `hop == size`).
- `Watermark()` = plus grand horodatage vu − `maxDelay` ; `math.MinInt64` avant le premier événement.
- `Add(e)` : ajoute `e` (Count + 1, Sum + Value) à chacune de ses fenêtres **encore ouvertes** (fin > watermark actuel). Si **aucune** ne l'est, c'est un **retardataire** : il est écarté et compté par `Late()`. Puis le watermark avance, et `Add` renvoie toutes les fenêtres dont la fin ≤ watermark, **une seule fois**, triées par fin, puis début, puis clé.
- `Flush()` émet tout ce qui reste ouvert (fin du flux), dans le même ordre.

Exemple (taille 60, délai 10) : après `a@5`, `b@40`, `a@65`, `a@50`, l'arrivée de `b@71` porte le watermark à 61 et émet `[0, 60)` pour `a` (2 événements) et `b` (1). Un `a@30` arrivé ensuite est un retardataire.

## Jalon 3 — Sessions et reprise sans doublon
- `Sessionize(events, gap)` : par clé, dans l'ordre du temps, un écart **≥ gap** entre deux événements consécutifs ouvre une nouvelle session. `Start` = premier horodatage, `End` = dernier + `gap`. Résultat trié par clé puis par début ; l'entrée n'est pas modifiée.
- `Consumer` additionne `Event.Value` par `Event.Key` à partir de `Record{Partition, Offset}`. `Apply` ignore (et renvoie `false`) tout message dont l'offset est **≤ au dernier offset appliqué de sa partition**. `ResumeOffset(p)` donne le prochain offset à lire.
- `Checkpoint()` renvoie une copie **indépendante** des offsets et des totaux ; `Restore(cp)` reconstruit un consommateur sans partager les maps du checkpoint.

## Le scénario qui doit marcher
Le consommateur applique des messages, prend un checkpoint, en applique d'autres, puis plante. On le restaure depuis le checkpoint et le broker relivre **tout depuis le début** : chaque paiement doit compter **une seule fois**.
