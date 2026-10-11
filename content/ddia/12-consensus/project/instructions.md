## Contexte

Tinybase est maintenant partitionné et répliqué. Deux problèmes d'accord restent à régler : valider atomiquement une transaction qui touche plusieurs partitions, et choisir sans humain quel nœud est leader d'un groupe de réplication. Tu écris les deux, en version **simulée et déterministe** : pas de réseau ni de goroutines, les « messages » sont des appels de méthodes, et une panne se simule en n'appelant pas un nœud. Les types, constantes et erreurs sont fournis.

## Jalon 1 — Le coordinateur 2PC
`Run(tx)` :
1. si `tx` figure déjà au journal : `ErrDuplicate` ;
2. écrire `begin` ; envoyer `Prepare` à chaque participant, dans l'ordre. Un refus **ou** une erreur (participant injoignable) suffit pour décider `Abort` ;
3. si `CrashAfter == "prepare"` : renvoyer `ErrCrashed` (rien n'est décidé) ;
4. **écrire la décision au journal** (`commit` ou `abort`) — c'est le point de non-retour ;
5. si `CrashAfter == "decision"` : renvoyer `ErrCrashed` (rien n'est diffusé) ;
6. envoyer `Commit` ou `Abort` à **tous** ; écrire `end` seulement si tous ont réussi. La décision est renvoyée même si un participant a échoué : elle est définitive.

`Recover()` relit le journal. Pour chaque transaction non terminée par `end` : sans décision, écrire `abort` puis diffuser `Abort` ; avec une décision, la rediffuser. Écrire `end` si tous acquittent. Renvoyer `tx → décision` pour chaque transaction traitée.

## Jalon 2 — L'élection Raft
- `HandleVote(req)` : terme plus grand → l'adopter, `VotedFor = 0`, redevenir `Follower` ; terme plus petit → refuser. Accorder la voix si `VotedFor` vaut 0 ou `req.CandidateID`, **et** si le log du candidat est au moins aussi à jour : dernier terme plus grand, ou dernier terme égal et index au moins aussi grand.
- `Elect(c, reachable)` : terme + 1, `Candidate`, vote pour soi, puis `HandleVote` sur chaque nœud joignable. Une réponse de terme plus grand : adopter ce terme, redevenir follower, `false`. Une majorité du cluster (`len(Peers) + 1` nœuds) : `Leader`, avec `NextIndex[p] = dernier index + 1` et `MatchIndex[p] = 0` pour chaque pair.

## Jalon 3 — Réplication et validation
- `Propose(cmd)` : seul le leader ajoute `Entry{Term: CurrentTerm, Cmd: cmd}` et renvoie son index (à partir de 1).
- `HandleAppend(req)` : terme périmé → refus avec `CurrentTerm`. Sinon : adopter le terme, redevenir follower ; refuser si l'entrée `PrevLogIndex` manque ou porte un autre terme que `PrevLogTerm` ; tronquer au **premier conflit** (même index, terme différent) seulement ; ajouter ce qui manque ; `CommitIndex = min(LeaderCommit, PrevLogIndex + len(Entries))` s'il augmente.
- `Replicate(l, reachable)` : pour chaque follower joignable, envoyer les entrées à partir de `NextIndex` ; après un refus, reculer `NextIndex` d'un cran et recommencer ; après un succès, mettre à jour `MatchIndex` et `NextIndex`. Une réponse de terme plus grand destitue le leader. Enfin, avancer `CommitIndex` au plus grand index **du terme courant** détenu par une majorité (le leader compte).

## Exemple
Cluster de 3 nœuds. Le leader a le log de termes `[1, 1, 2, 2]` et passe au terme 4 ; un follower revenu de panne a `[1, 1, 3, 3, 3]`. Après `Propose("y")` et `Replicate`, le follower a exactement le log du leader `[1, 1, 2, 2, 4]` : ses entrées 3 à 5 ont été écrasées.
