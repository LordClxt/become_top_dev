## Hint 1
Un seul état à suivre dans `OpenLoop` : l'instant où le serveur redevient libre.

## Hint 2
`start = max(arrival, free)` puis `free = start + service[i]`. Le temps de réponse est `free − arrival`.

## Hint 3
Pour `Summarize`, trie une copie (`slices.Clone` puis `slices.Sort`) et factorise le calcul du rang dans une petite fonction locale.
