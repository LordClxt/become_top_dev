## Hint 1
`Open` : récupère les identifiants avec `segID`, trie-les, et rejoue chaque segment avec `decode` comme dans le TP Bitcask. Un enregistrement invalide dans tout segment sauf le dernier : `ErrCorrupt`.

## Hint 2
Index : `map[string]loc` avec `loc{seg, off}`. `Set` ajoute à `dir[segName(db.active)]` ; après l'écriture, si la taille atteint `MaxSegmentBytes`, incrémente `db.active` et crée le nouveau fichier (vide).

## Hint 3
`Compact` : liste les clés dont `loc.seg != active`, triées par (segment, offset) pour garder l'ordre d'écriture ; ré-encode leurs valeurs dans un seul `[]byte`, supprime les anciens fichiers, écris le fichier fusionné sous l'identifiant du plus récent segment fermé, puis mets l'index à jour.
