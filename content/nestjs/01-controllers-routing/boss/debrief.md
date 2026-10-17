## Ce que ce combat évaluait

- **Les statuts justes, obtenus sans contournement.** 201 + `Location` avec `passthrough`, 204 avec `@HttpCode`, les erreurs par exceptions : la réponse reste standard et un intercepteur pourra la transformer plus tard.
- **La validation à la frontière.** Un schéma pour le corps, des pipes pour la query et l'`id` ; les règles métier (auteur déjà présent, livre inconnu) dans le service.
- **Des bornes sur tout ce qui coûte** : `limit ≤ 20` protège la base le jour où les avis se comptent par milliers.
- **Le routage déterministe.** `routeResolutionStrategy: 'specificity'` enregistre `summary` (segment littéral) avant `:id` (paramètre), quel que soit l'ordre des méthodes ; `routeConflictPolicy` en erreur fait échouer le démarrage si quelqu'un réintroduit un masquage.
- **Le versioning sans casse.** v2 change l'enveloppe ; v1 reste un tableau, pour les partenaires déjà intégrés.
