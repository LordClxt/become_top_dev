## Hint 1
Pour retirer l'ancienne entrée d'un document, il faut se souvenir de sa valeur actuelle : garde une table clé → valeur (ou clé → groupe) en plus de la table valeur → clés.

## Hint 2
`Apply` en trois temps : valider l'événement ; ignorer si `ev.Offset <= offset` ; retirer l'ancienne entrée, ajouter la nouvelle (sauf suppression ou champ absent), puis seulement avancer l'offset. `CatchUp` vérifie l'ordre de tout le log avant la première application.

## Hint 3
Dans `Migration.Apply`, calcule `Ready()` **avant** d'appliquer l'événement à l'ancienne vue. Si la nouvelle vue est en retard, ne lui donne rien : un offset 130 reçu en direct ferait ignorer les offsets 1 à 129 au `Backfill`. `Rollback` ne dépend que d'une chose : l'ancienne vue est-elle encore maintenue ?
