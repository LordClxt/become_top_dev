**Un producteur, une cascade de testeurs, des transformateurs, un consommateur.** Chaque filtre a une seule tâche et ne connaît que son voisin. La nouvelle métrique s'insère **après** Uptime Filter : Duration Filter, Duration Calculator et les autres ne changent pas d'une ligne. C'est l'extensibilité propre au pipeline.

Le revers : tout tourne dans un seul déployable. Si la nouvelle métrique déclenche un dépassement de mémoire, c'est toute la télémétrie qui tombe.
