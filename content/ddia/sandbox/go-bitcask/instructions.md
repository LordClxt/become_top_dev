## Contexte

Tu construis le moteur de la leçon : un **log en ajout seul** indexé par une **table de hachage en mémoire** (clé → offset), avec pierres tombales, somme de contrôle et compaction. Le « fichier » est un simple `[]byte` : cela te permet de simuler un crash en le coupant ou en retournant un bit.

## Format d'un enregistrement (fourni : `encode` et `decode`)

```
crc32 | keyLen | valLen (−1 = pierre tombale) | clé | valeur
```

Le CRC couvre tout ce qui suit lui. `decode` renvoie `ok == false` pour un enregistrement tronqué **ou** dont la somme de contrôle est fausse.

## À implémenter dans `bitcask.go`

- **`Set`** ajoute un enregistrement et met l'index à jour (offset = taille du log avant l'ajout).
- **`Get`** : une recherche dans l'index, puis la lecture à l'offset.
- **`Delete`** : si la clé existe, ajoute une **pierre tombale** et la retire de l'index ; renvoie `true`. Sinon ne fait rien, `false`.
- **`Open(log)`** : rejoue le log du début. Une pierre tombale retire la clé de l'index. Elle **s'arrête au premier enregistrement invalide** et renvoie le nombre d'octets ignorés ; le log du Store est **tronqué** à la fin du dernier enregistrement valide (pour qu'on puisse continuer à écrire). Le slice fourni n'est pas conservé.
- **`Len`**, **`Log`** (copie).
- **`Compact`** : réécrit le log avec une seule valeur par clé vivante (dans l'ordre où elles avaient été écrites), sans pierres tombales, et reconstruit l'index.

## Ce que les tests simulent

Un crash à **chaque octet** de l'écriture d'un enregistrement, un bit retourné au milieu du log, 100 mises à jour d'une même clé suivies d'une compaction.
