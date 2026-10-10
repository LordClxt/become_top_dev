## Hint 1
`Ptr` : un paramètre est une variable, donc il a une adresse. Renvoie `&v`. Pas besoin de plus : chaque appel crée une nouvelle variable `v`.

## Hint 2
`Deref`, `Swap`, `IncrementAll` : commence chacune par un test `p == nil`. L'échange se fait en une ligne avec une affectation multiple : `*a, *b = *b, *a`.

## Hint 3
`Largest` : garde l'**indice** du maximum plutôt que sa valeur, puis renvoie `&xs[indice]`. Si tu renvoyais l'adresse de la variable de boucle ou d'une copie, tu ne pointerais pas dans la slice. Pour `FullName`, `strings.TrimSpace` et un test sur `p.MiddleName != nil` avant de lire `*p.MiddleName`.
