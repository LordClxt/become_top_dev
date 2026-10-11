## Hint 1
Chaque événement local, y compris un envoi, ajoute 1. Une réception fait `max(local, reçu) + 1`.

## Hint 2
Ordre de Lamport : compare les compteurs ; à égalité seulement, l'identifiant de nœud.

## Hint 3
Une réplique de diffusion à ordre total ne livre le message n que si elle a livré 1 à n − 1 : un trou bloque tout ce qui suit.
