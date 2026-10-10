## Hint 1
`Merge` : pour chaque champ, choisis la source (`override` si non nil, sinon `base`), puis, si elle n'est pas nil, copie la valeur dans une nouvelle variable et renvoie son adresse. Une petite fonction générique `clone` évite de répéter trois fois la même logique.

## Hint 2
`ParseOptionalInt` : `strings.TrimSpace`, retourne `nil, nil` si la chaîne est vide, sinon `strconv.Atoi`. N'oublie pas que `n` est une variable locale : `&n` est sûr, Go l'alloue sur le tas si besoin.

## Hint 3
`ReadChunks` : une boucle infinie. `n, err := r.Read(buf)`. Si `n > 0`, appelle `handle(buf[:n])` et propage son erreur. **Ensuite** seulement, regarde `err` : `io.EOF` donne `nil`, toute autre erreur est renvoyée. Teste `errors.Is(err, io.EOF)` plutôt que `err == io.EOF`.
