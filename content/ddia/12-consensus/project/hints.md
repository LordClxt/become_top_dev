## Hint 1
2PC : un seul `for` sur les participants pour les votes, un autre pour la diffusion ; mets la diffusion dans une petite méthode `finish(tx, d)` réutilisée par `Recover`. Pour `Recover`, construis d'abord l'état final de chaque transaction (dernière ligne vue), en gardant l'ordre d'apparition.

## Hint 2
Raft : écris une méthode `observe(term)` qui applique la règle des termes (terme plus grand → follower, `VotedFor = 0`) et appelle-la partout. Majorité du cluster : `(len(Peers)+1)/2 + 1`. Règle « au moins aussi à jour » : `req.LastLogTerm > lt || (req.LastLogTerm == lt && req.LastLogIndex >= li)`.

## Hint 3
`HandleAppend` : boucle sur les entrées avec `idx := PrevLogIndex + 1 + i` ; si `idx <= len(Log)` et le terme diffère, `Log = Log[:idx-1]` ; puis si `idx > len(Log)`, ajoute. `Replicate` : pour la validation, parcours `n` de `len(Log)` jusqu'à `CommitIndex + 1`, arrête-toi dès qu'une entrée n'est pas du terme courant, compte 1 + les pairs dont `MatchIndex >= n`.
