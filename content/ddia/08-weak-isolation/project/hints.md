## Hint 1
Écris une seule petite fonction `sees(id TxID) bool` : « les effets de la transaction id font-ils partie de mon instantané ? ». Une version est visible si `sees(CreatedBy)` et pas `sees(DeletedBy)` (avec DeletedBy à 0 = jamais supprimée). Tout le jalon 2 en découle.

## Hint 2
`sees(id)` : vrai si `id` est la transaction elle-même ; sinon `id != 0 && id < tx.id && !tx.active[id] && status[id] == Committed`. Pour `Get`, si la clé est dans `writes`, renvoie ta version en attente ou « absent » ; sinon parcours les versions de la plus récente à la plus ancienne et renvoie la première visible.

## Hint 3
Conflit au commit : pour chaque clé écrite, parcours ses versions ; si `CreatedBy` ou `DeletedBy` est une transaction validée, différente de toi, que tu ne « vois » pas, refuse. Pour `Vacuum`, l'horizon n'est pas le plus petit identifiant en cours : une transaction d'identifiant 3 qui a démarré pendant la transaction 2 ne verra jamais la 2 ; c'est pour cela que `xmin` tient compte de `active`.
