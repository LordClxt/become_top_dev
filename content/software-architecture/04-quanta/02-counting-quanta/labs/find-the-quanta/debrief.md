**Le seul lien entre les deux quanta est la réplication asynchrone.** La base catalogue appartient à l'administration, qui la modifie ; la partie client lit sa **copie**. Si l'administration est en maintenance, ou si la base primaire ralentit, les clients continuent de commander sur les dernières données répliquées.

Le prix : la copie peut avoir quelques secondes de retard (un produit modifié n'apparaît pas tout de suite). C'est le trade-off à écrire dans l'ADR, et il est acceptable pour des données de référence qui changent peu.
