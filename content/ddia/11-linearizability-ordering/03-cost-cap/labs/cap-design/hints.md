## Hint 1
Avec un leader unique à Paris, tout ce qui doit être linéarisable passe par Paris. Un réplica local ne peut offrir que des lectures éventuellement obsolètes.

## Hint 2
Une écriture linéarisable depuis Montréal coûte au moins un aller-retour vers le leader. Pour la page, les requêtes sont séquentielles : multiplie.

## Hint 3
Les partitions ne sont pas un choix. La RAM multicœur n'est jamais « coupée », et pourtant elle n'est pas linéarisable.
