## Hint 1
`Compare` : deux booléens, « a est en retard quelque part » et « b est en retard quelque part ». Parcours les clés de `a`, puis celles de `b` absentes de `a`. Les deux vrais → concurrent.

## Hint 2
`Prune` : une version est gardée si aucune autre ne la remplace (`SupersededBy`) et si elle n'a pas déjà été vue (même `Node` et `Seq`). Chaque réplica stocke `Prune(ancien ∪ nouveau)` : c'est la même opération pour une écriture, un read repair ou l'anti-entropie.

## Hint 3
`Get` : `asked := up[:r]`, concatène leurs versions, `merged := Prune(all)`, puis applique `merged` sur chaque réplica interrogé. Le contexte est la fusion des `Clock()` de `merged`. `Put` : copie `ctx` avec `Merge(ctx, nil)` avant de le ranger dans `Seen`.
