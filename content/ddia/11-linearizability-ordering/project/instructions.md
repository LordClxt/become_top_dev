## Contexte

Tinybase est maintenant répliqué, et le chapitre 10 t'a appris que les horloges murales mentent. Pour savoir **dans quel ordre** les choses se sont passées, et pour garantir qu'un nom d'utilisateur n'a qu'un seul propriétaire, tu construis trois briques. Les types, constantes et erreurs sont fournis ; tout se passe dans `ordering.go`.

## Jalon 1 — L'horloge de Lamport
- `Tick()` : événement local ou envoi d'un message, le compteur avance de 1.
- `Observe(ts)` : réception d'un message horodaté `ts`, le compteur devient `max(local, ts.Counter) + 1`. L'horodatage renvoyé porte l'identifiant **du nœud local**.
- `Now()` lit l'horodatage sans rien changer.
- `Less` : ordre total, **compteur d'abord**, puis identifiant de nœud pour départager. `SortTimestamps` trie avec cet ordre.

Exemple : le nœud 1 est à 2, il reçoit un message du nœud 2 horodaté 10 ; il passe à `{11, 1}`.

## Jalon 2 — Le juge de linéarisabilité
Un historique est une liste d'opérations vues par des clients, chacune entre `Start` (requête envoyée) et `End` (réponse reçue) :
- `OpWrite` écrit `Arg` ;
- `OpRead` a lu `Result` ;
- `OpCAS` : si la valeur vaut `Expect`, elle devient `Arg` et `OK` vaut `true` ; sinon rien ne change et `OK` vaut `false`.

`Linearize(initial, h)` cherche un **ordre total** des opérations tel que :
1. si `a.End < b.Start`, `a` vient avant `b` (le temps réel est respecté) ; deux opérations qui se chevauchent peuvent être dans n'importe quel ordre ;
2. rejouées dans cet ordre sur un registre qui vaut `initial`, chaque opération produit exactement le résultat observé.

Renvoie les indices dans l'ordre trouvé, ou `ErrNotLinearizable`. Une opération avec `Start >= End` ou un `Kind` inconnu donne `ErrBadOp`. Les historiques testés ont moins de 10 opérations : une recherche exhaustive par retour arrière suffit.

## Jalon 3 — Diffusion à ordre total par séquenceur
- `Sequencer.Assign` numérote les messages 1, 2, 3…
- `Replica.Receive(m)` : les messages arrivent dans le désordre, parfois en double. La réplique met `m` en attente et **livre** tout ce qui devient contigu à partir du prochain numéro attendu. Elle ignore les doublons, les numéros déjà livrés et le numéro 0. Elle renvoie les messages livrés par cet appel.
- `Delivered()` renvoie une **copie** du log livré.
- `Owners(log)` : chaque message est une revendication (`From` veut le nom `Payload`). Le **premier** dans l'ordre du log gagne.

Toutes les répliques, quel que soit l'ordre d'arrivée, doivent finir avec le même log et les mêmes propriétaires.
