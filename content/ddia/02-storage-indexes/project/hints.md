## Hint 1
`open` : récupère les identifiants avec `segId`, trie-les (`(a, b) => a - b`), et rejoue chaque segment avec `decode` comme dans le TP Bitcask. Un enregistrement invalide dans tout segment sauf le dernier : `CorruptError`.

## Hint 2
Index : `Map<string, Loc>` avec `{ seg, off }`. `set` ajoute à `dir.get(segName(this.#active))` avec `concat` ; après l'écriture, si la taille atteint `maxSegmentBytes`, incrémente `#active` et crée le nouveau fichier (vide).

## Hint 3
`compact` : liste les clés dont `loc.seg !== active`, triées par (segment, offset) pour garder l'ordre d'écriture ; ré-encode leurs valeurs dans un seul tableau d'octets, supprime les anciens fichiers, écris le fichier fusionné sous l'identifiant du plus récent segment fermé, puis mets l'index à jour.
