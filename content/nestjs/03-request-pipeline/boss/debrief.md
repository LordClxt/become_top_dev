## Ce que ce combat évaluait

- **Chaque brique à sa place.** Le middleware ouvre le contexte (il s'exécute avant tout, même avant le routage) ; les guards décident (qui, quels droits, quel crédit) ; l'intercepteur façonne les succès ; le filtre global façonne **toutes** les erreurs, y compris celles du routeur et des guards.
- **L'ordre des guards.** Enregistrés par `APP_GUARD`, ils s'exécutent dans l'ordre d'enregistrement et s'arrêtent au premier refus. Authentifier, puis autoriser, puis compter : ainsi un 401 ou un 403 ne consomme pas de quota, et le quota n'est jamais calculé pour un inconnu.
- **Override ou merge.** Les portées s'additionnent : `getAllAndMerge([classe, méthode])`. Pour des rôles qui se remplacent, c'était `getAllAndOverride`.
- **Des erreurs pour les machines.** Un `errorCode` stable (`QUOTA_EXCEEDED`) et `retry-after` permettent au partenaire de réessayer correctement ; le détail d'une panne (`ECONNREFUSED 10.0.0.12`) reste dans les journaux.
- **Le contexte sans contagion.** `AsyncLocalStorage` rend l'identifiant de requête lisible dans le filtre et l'intercepteur, qui restent des singletons.
- **En production**, le quota en mémoire ne tient que sur une instance : avec plusieurs réplicas, il faut un compteur partagé (Redis), ce que fait `@nestjs/throttler` avec un stockage distribué (chapitre 08).
