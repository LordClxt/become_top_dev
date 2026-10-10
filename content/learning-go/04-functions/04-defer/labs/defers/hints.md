## Hint 1
`Session` : dans la boucle, après avoir ajouté `"open " + name`, écris un `defer` qui ajoutera `"close " + name` au journal. Les `defer` s'exécutent en ordre inverse, ce qui donne gratuitement le bon ordre de fermeture.

## Hint 2
Le journal est modifié **après** le `return` : il faut que `log` soit un retour nommé (c'est déjà le cas dans la signature), et que le `defer` soit une closure qui l'étend. Passe `name` en argument du `defer` (`defer func(n string) { … }(name)`) pour fixer sa valeur à l'enregistrement.

## Hint 3
`WithTx` : appelle `begin`, puis enregistre un `defer`. Garde un booléen `finished` mis à `true` juste après le retour de `work`. Dans le `defer` : si `!finished`, c'est une panique → `Rollback`. Sinon, si `err != nil` → `Rollback` (et joins son erreur si elle existe) ; sinon `err = tx.Commit()` puis `Rollback` si le commit a échoué.
