## Hint 1
`normalizeRequest` : `const durationMin = input.durationMin ?? 30;` puis la validation ; renvoie un objet complet.

## Hint 2
Candidats : trie les salles par capacité, puis pour chaque `startMin` (de 15 en 15) et chaque salle, teste qu'aucune réunion de cette salle ne chevauche `[startMin, startMin + durationMin)`.

## Hint 3
`String(Math.floor(min / 60)).padStart(2, '0')` pour formater les heures.
