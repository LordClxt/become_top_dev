## Contexte

Minigrails a besoin d'une petite boîte à outils pour envelopper des appels fragiles ou coûteux. Tu en écris quatre outils dans `Toolbox.groovy`, qui rassemblent tout ce que tu as vu dans les leçons 1 à 3.

## À écrire

| Outil | Rôle |
|---|---|
| `retry(times, c)` | rejoue `c(tentative)` jusqu'au succès ; relance la dernière exception après `times` échecs |
| `timed(c)` | exécute `c` et renvoie `[result:, millis:]` |
| `once(c)` | closure qui n'exécute `c` qu'une fois et mémorise le résultat (rien de mémorisé si le premier appel échoue) |
| `groupCount(items, key)` | compte les éléments par clé, dans l'ordre de première apparition |

Le détail de chaque règle est dans le commentaire de `Toolbox.groovy`.

## Ce qui sera noté

Les tests comptent pour 60 %. Le reste est une relecture : l'état de `once` est-il capturé dans la closure renvoyée ? Les sorties anticipées utilisent-elles un `for` (et non `each`) ?
