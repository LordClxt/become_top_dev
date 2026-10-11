## Contexte

Tinybase passe en mode **Dynamo** : plus de leader, n réplicas qui acceptent tous les écritures. Le client (ici, ton `Cluster`) envoie chaque écriture à tous les réplicas disponibles et attend **w** accusés ; il lit **r** réplicas et garde la version la plus récente. Mais « la plus récente » n'existe pas toujours : deux clients peuvent écrire en même temps. Plutôt que d'en jeter une (LWW), Tinybase garde les deux comme **siblings** et laisse l'application les fusionner. Les types, erreurs et l'aide `Local` sont fournis.

## Jalon 1 — Vecteurs de versions
- `Compare(a, b)` renvoie `Equal`, `Before` (b connaît tout ce que connaît a, et plus), `After` ou `Concurrent`. Une entrée absente vaut 0.
- `Merge(a, b)` renvoie un **nouveau** vecteur : le maximum entrée par entrée.
- Une `Version` porte sa valeur, l'identifiant de son écriture (`Node`, `Seq` : le réplica coordinateur et son compteur) et `Seen`, le contexte que le client avait lu. `Clock()` = `Seen` plus l'écriture elle-même.
- `v.SupersededBy(o)` : vrai si l'écrivain de `o` avait vu `v`, c'est-à-dire `o.Seen[v.Node] >= v.Seq`.
- `Prune(vs)` retire doublons et versions remplacées, trie par `Node` puis `Seq`, ne renvoie jamais nil.

Exemple : `{A:2, B:1}` contre `{A:1, B:2}` → `Concurrent`. Deux versions `{A, 1, {}}` et `{A, 2, {}}` coordonnées par le même réplica, sans contexte : **concurrentes**, `Prune` garde les deux.

## Jalon 2 — Quorums et read repair
- `NewCluster(ids, w, r)` : `ErrConfig` si `w` ou `r` sort de [1, n] ou si un identifiant est vide ou dupliqué.
- `Put(key, value, ctx)` : le **premier réplica disponible** coordonne (compteur + 1), la version part vers **tous** les réplicas disponibles. Moins de `w` disponibles → `ErrNoQuorum`, **sans** annuler ce qui a été écrit.
- `Get(key)` interroge exactement les **r premiers** réplicas disponibles, fusionne, **répare** ceux qui étaient en retard, et renvoie les valeurs triées plus le `Context` à renvoyer au prochain `Put`.

Avec n = 3, w = 2, r = 2 : A est en panne pendant `Put(v1)`, puis revient. `Get` lit A et B, renvoie `v1` et réécrit `v1` sur A. Avec r = 1, la même lecture ne voit que A… et ne renvoie rien.

## Jalon 3 — Siblings, fusion, anti-entropie
- Deux `Put` avec le même contexte produisent deux siblings ; un `Put` avec le contexte d'une lecture les remplace tous.
- `UnionMerge(siblings)` fusionne des paniers `"lait,oeufs"` par union triée.
- `AntiEntropy()` aligne tous les réplicas disponibles sur toutes les clés et renvoie le nombre de couples (réplica, clé) modifiés.

## Contraintes
Bibliothèque standard uniquement. Aucune goroutine nécessaire : le cluster est simulé en mémoire, de façon déterministe.
