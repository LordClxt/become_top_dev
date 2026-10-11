## Hint 1
Pour le détecteur, une map `node → *history` suffit. Après chaque ajout, si `len(intervals) > window`, garde `intervals[len(intervals)-window:]`. Calcule moyenne et variance en `float64`, puis `math.Sqrt`.

## Hint 2
Dans le service de baux, un bail est valide si `Holder != ""` et `now < Expires`. Prends le mutex au début de `Acquire` et `Renew` : lire l'horloge, tester, puis attribuer doit se faire sans qu'un autre appel s'intercale. Le compteur de jetons ne redescend jamais, même quand un bail expire.

## Hint 3
Le stockage garde par clé une paire `(valeur, plus grand jeton)`. Teste `token == 0` d'abord, puis `token < courant.token` ; sinon écrase la paire. Dans les scénarios, ce n'est jamais le client qui décide s'il a le droit d'écrire : c'est cette comparaison.
