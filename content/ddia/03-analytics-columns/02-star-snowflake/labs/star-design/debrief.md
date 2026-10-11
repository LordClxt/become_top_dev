**Un schéma en étoile se dessine à la même recette.** Au centre, la table de faits : une ligne par événement (un achat d'un produit). Autour, une dimension pour chaque question — qui, quoi, où, quand, comment — rattachée par clé étrangère. Même la date est une dimension, pour pouvoir y ranger les jours fériés ou le trimestre fiscal.

Le **flocon** décomposerait `dim_product` en marque et catégorie dans des tables à part : plus normalisé, mais les analystes écrivent plus de jointures. L'étoile reste le choix par défaut.
