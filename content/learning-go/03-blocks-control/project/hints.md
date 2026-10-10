## Hint 1
`ExpandField` : découpe sur `,`, puis chaque élément sur `/` (le pas) ; la base est `*`, `A-B` ou `N`. Un `switch` sans expression sur la forme de la base est naturel. Accumule dans une `map[int]bool` pour supprimer les doublons, puis trie.

## Hint 2
Écris une petite fonction `atoi` qui n'accepte que des chiffres : `strconv.Atoi` accepterait `+5` ou `-1`, que le format refuse. Dans `Parse`, un tableau de champs (nom, min, max, destination) évite de répéter cinq fois le même code ; enveloppe l'erreur avec `fmt.Errorf("champ %s : %w", …)`.

## Hint 3
Pour `Next`, pars de la minute suivante et boucle tant que tu es avant `after + 5 ans`. Dans la boucle, un `switch` sans expression teste du plus grand au plus petit : mois incorrect → saute au premier du mois suivant ; jour (ou jour de semaine) incorrect → saute à minuit du lendemain ; heure incorrecte → saute à l'heure suivante ; minute incorrecte → ajoute une minute ; sinon renvoie. `time.Date` normalise les dépassements (mois 13, jour 32, minute 60), ce qui simplifie les incréments.
