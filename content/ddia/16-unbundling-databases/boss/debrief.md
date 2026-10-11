**C'est la base dégroupée du chapitre, de bout en bout.** Une seule écriture applicative va vers la base de référence ; son log fixe l'ordre de tout le reste. L'index de recherche est un index secondaire sorti de la base : amorcé par un instantané et son offset, puis maintenu par l'indexeur, il ne reçoit rien d'autre. Pas de double écriture, pas de coordinateur XA : les pannes restent locales et le log met en tampon.

La vue « par ville » et la vue « CA par pays et semaine » sont dérivées **en parallèle** du même log : la migration reste réversible tant que la v1 vit. La v2 est poussée par WebSocket jusqu'à l'app, ce qui prolonge le chemin d'écriture jusqu'à l'écran, sans interrogation périodique.

Enfin, le service commandes ne dépend d'aucun appel synchrone : il s'abonne au flux des taux et lit sa table locale, ce qui est plus rapide et survit à la panne de l'équipe finance.
